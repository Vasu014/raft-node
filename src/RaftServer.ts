import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { ProtoGrpcType } from './grpc-js/proto/raft';
import * as dotenv from 'dotenv';
import { logger } from './logger/Logger';
import { RaftServiceHandlers, RaftServiceClient } from './grpc-js/proto/raft/RaftService';
import * as events from 'events';

dotenv.config();
const PROTO_PATH = './../proto/raft.proto';
const packageDefinition = protoLoader.loadSync(
    __dirname + PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });

const loadedPackageDefinition = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

enum NodeState {
    FOLLOWER = 'FOLLOWER',
    CANDIDATE = 'CANDIDATE',
    LEADER = 'LEADER'
}

enum LogCommand {
    HEARTBEAT = 'HEARTBEAT',
    APPEND = 'APPEND'
}

interface LogEntry {
    term: number;
    command: string;
}

/**
 * Functions performed:
 * 1. Reset heartbeat timeout [Done]
 * 2. Reset election timeout [Done]
 * 3. Start Election [Done]
 * 4. Request For Vote ( state == NodeState.CANDIDATE)
 * 5. Send Append Log Requests ( state == NodeState.LEADER )
 * 6. Initialize
 * 7. Service AppendRequest ( state == NodeState.FOLLOWER)
 * 8. Service HeartBeat ( state = NodeState.FOLLOWER or state == NodeState.CANDIDATE)
 * 9. Send HeartBeat ( state = NodeState.LEADER ) 
 * 10. Shutdown
 * 11. Prepare to lead (initializes all the leader related variables)
 * 
 */
class RaftServer {
    private _serverId: number;
    private _nodeIds: number[];
    private _peerCount: number;
    private _idToAddrMap: Map<number, string>;
    private _idToClientMap: Map<number, RaftServiceClient>;
    private _server: grpc.Server = new grpc.Server();
    private _heartbeatTimeout: any;
    private _heartbeatSenderTimeout: any;
    private _electionTimeout: any;
    private _nodeState: NodeState;
    private _emitter: events.EventEmitter;

    // Persistent state (Should be updated on stable storage before replying to RPC)
    private _currentTerm: number; // latest term seen by server
    private _prevTerm: number;
    private _votedFor: number | null; // vote for the latest election
    private _log: LogEntry[]; // commands for fsm, {command, term}, 1-indexed

    // Volatile state [all servers]
    private _commitIndex: number; // highest known commit index [0,)
    private _lastApplied: number; // index of highest log applied to fsm [0,)

    // Volatile state [leader state only]
    private _nextIndex: number[]; // for each server, index of next to be sent, [leader lastLogIndex+1,)
    private _matchIndex: number[]; // for each server, index of highest entry known to be replicated [0,)


    constructor(serverId: number, serverAddr: string) {
        this._serverId = serverId;
        this._nodeIds = [];
        this._peerCount = 0;
        this._idToAddrMap = new Map<number, string>();
        this._idToClientMap = new Map<number, RaftServiceClient>();
        this._nodeState = NodeState.FOLLOWER;
        this._electionTimeout = -1;
        this._heartbeatTimeout = -1;
        this._currentTerm = 0;
        this._prevTerm = 0;
        this._votedFor = null;
        this._emitter = new events.EventEmitter();
        this._log = []

        this._commitIndex = 0;
        this._lastApplied = 0;

        this._nextIndex = [];
        this._matchIndex = [];
        this._initializeServer(serverAddr);
        this._resetHeartbeatTimeout();


    }

    getCurrentState(): NodeState {
        return this._nodeState;
    }

    getId(): number {
        return this._serverId;
    }

    getCurrentTerm(): number {
        return this._currentTerm;
    }

    _logInfo(msg: string): void {
        logger.info('Server ' + this._serverId + ': ' + msg);
    }

    _logError(msg: string): void {
        logger.error('Server' + this._serverId + ': ' + msg);
    }

    /**
     * We initialize all the servers in the cluster, and assign them localhost/addresses.
     */
    _initializeServer(addr: string): void {
        const server = new grpc.Server();
        const serviceHandler = this._createServiceHandlers();
        server.addService(loadedPackageDefinition.raft.RaftService.service, {
            RequestForVote: serviceHandler.RequestForVote,
            AppendEntries: serviceHandler.AppendEntries
        });

        server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), (err, port) => {
            server.start();
            this._server = server;
        });
    }

    /**
     * Timer which waits for Leader Heartbeat, while server is in FOLLOWER state.
     * On timeout, state change to CANDIDATE and leader-election is initiated
     */
    _resetElectionTimeout() {
        const threshold = process.env.ELECTION_TIMEOUT ? parseInt(process.env.ELECTION_TIMEOUT) : 1000;
        this._electionTimeout = setTimeout(() => {
            this._resetElectionTimeout();
        }, threshold);
    }

    /**
     * Timer which waits for Leader Heartbeat, while server is in FOLLOWER state.
     * On timeout, state change to CANDIDATE and leader-election is initiated
     */
    _resetHeartbeatTimeout() {
        const threshold = process.env.HEARTBEAT_TIMEOUT ? parseInt(process.env.HEARTBEAT_TIMEOUT) : 2000;
        if (this._heartbeatTimeout !== -1) {
            clearTimeout(this._heartbeatTimeout);
        }
        this._heartbeatTimeout = setTimeout(() => {
            this._logInfo('Heartbeat timed out. Moving to Candidate and starting election');
            if (this._nodeState === NodeState.FOLLOWER) {
                this._nodeState = NodeState.CANDIDATE;
                this._conductLeaderElection();
            }
        }, threshold);
    }

    async _sendHeartbeats() {
        this._logInfo('Sending heartbeats to all peers');
        let counter = 0
        this._nodeIds.forEach(id => {
            this._logInfo('Sending heartbeat to Server: ' + id);
            if (!this._idToClientMap.has(id)) {
                this._logInfo('Error!! No Client present for server id: ' + id);
                return;
            }
            const client = this._idToClientMap.get(id);
            client?.AppendEntries(
                {
                    term: this._currentTerm,
                    leaderId: this._serverId,
                    prevLogIndex: this._lastApplied,
                    prevLogTerm: this._currentTerm - 1,
                    entries: []
                },
                (err, result) => {
                    if (err) {
                        this._logInfo('Error while sending heartbeat: ' + err);
                    }
                    this._logInfo('Received result: ' + JSON.stringify(result));
                    counter += 1;
                    if (counter === this._nodeIds.length) {
                        this._heartbeatSenderTimeout = setTimeout(() => this._sendHeartbeats(), 1000);
                    }
                }
            )
        });

    }

    // Once all servers are up and running, we connect each servers to it's N-1 peers
    initiatePeerConnections(peerIds: number[], idAddrMap: Map<number, string>) {
        this._nodeIds = peerIds.filter(id => id != this._serverId);
        this._nodeIds.forEach(id => {
            this._logInfo('Connecting to Server: ' + id);
            const value = idAddrMap.get(id);
            const clientAddr: string = value != undefined ? value : '';
            const client: RaftServiceClient = new loadedPackageDefinition.raft.RaftService(clientAddr, grpc.credentials.createInsecure());
            this._idToClientMap.set(id, client);
            this._idToAddrMap.set(id, clientAddr);
            this._peerCount += 1;
        });

    }

    disconnectAllPeers() {

    }

    shutDown() {

    }

    // TODO: Use conditional types for typechecking for optional and undefined values                                                        
    _createServiceHandlers() {
        const serviceHandlers: RaftServiceHandlers = {
            RequestForVote: (call, cb) => {
                const request = call.request;
                if (this._nodeState !== NodeState.FOLLOWER) {
                    this._logInfo('Received a vote request from ' + request.candidateId);
                    //logger.info('Current votedFor: ' + this.votedFor);
                    if (request.candidateId && (request.candidateId == this._votedFor || this._votedFor == null)) {
                        this._votedFor = request.candidateId;
                        cb(null, { term: this._currentTerm, voteGranted: true });
                    } else {
                        cb(null, { term: this._currentTerm, voteGranted: false });
                    }

                } else {
                    cb(null, { term: this._currentTerm, voteGranted: false });
                }
            },


            /**
             * Cases (For heartbeats):
             * 1. receiver is in state === NodeState.FOLLOWER
             * 2. receiver is in state === NodeState.CANDIDATE
             * 
             */
            AppendEntries: (call, cb) => {
                const request = call.request;
                const term = request.term ? request.term : -1;
                const entries: any[] = request.entries ? request.entries.map(entry => {
                    return {
                        term: entry.term ? entry.term : -1,
                        command: entry.command ? entry.command : 'HEARTBEAT'
                    }
                }) : [];
                const prevLogIndex = request.prevLogIndex ? request.prevLogIndex : -1;
                const prevLogTerm = request.prevLogTerm ? request.prevLogTerm : -1;

                if (this._nodeState === NodeState.FOLLOWER) {
                    this._logInfo('Heartbeat received from current leader: ' + request.leaderId);
                    this._logInfo('Resetting heartbeat timeout');
                    this._resetHeartbeatTimeout()
                    cb(null, { term: this._currentTerm, success: true });
                } else if (this._nodeState === NodeState.CANDIDATE) {
                    this._nodeState = NodeState.FOLLOWER;
                    this._logInfo('Heartbeat received from current leader: ' + request.leaderId);
                    this._logInfo('Moving to FOLLOWER state. Resetting heartbeat timeout');
                    this._resetHeartbeatTimeout();
                    cb(null, { term: this._currentTerm, success: true });
                }

            }
        }

        return serviceHandlers;
    }

    async _appendLogHandler() {

    }

    _initiateLeaderState() {
        this._nodeState = NodeState.LEADER;
        //TODO: initialize commitIndexes, nextIndexes for each peer server as well
        this._prevTerm = this._currentTerm;
        if (this._heartbeatSenderTimeout == null) {
            this._heartbeatSenderTimeout = setTimeout(() => this._sendHeartbeats(), 1000);
        }

        this._logInfo('Moved to  state: LEADER');
    }

    // Leader election logic. Election is conducted when server moves to CANDIDATE state. 
    async _conductLeaderElection(): Promise<void> {
        this._logInfo('Starting Leader election');
        if (this._prevTerm == this._currentTerm) {
            this._currentTerm += 1;
        }
        //TODO: Make this equal self id and randomize heartbeat timeouts to prevent deadlock elections.
        this._votedFor = null;
        const voteCount = [1];
        this._electionTimeout = setTimeout(() => this._conductLeaderElection(), 2000);
        try {
            this._nodeIds.forEach(id => {
                const client = this._idToClientMap.get(id);
                client?.RequestForVote({
                    term: this._currentTerm,
                    candidateId: this._serverId,
                    lastLogIndex: this._commitIndex,
                    lastLogTerm: 0
                }, (err, result) => {
                    if (err) {
                        this._logError('Received Error in gRPC Reply' + err);
                    } else {
                        //TODO: Save individual votes during current election cycle
                        if (result?.term === undefined || result?.voteGranted === undefined) {
                            throw new Error('RPC Reply Term or voteGranted is undefined');
                        }
                        const resultTerm = result?.term ? result.term : -1;
                        const voteGranted = result?.voteGranted ? result.voteGranted : false;

                        if (resultTerm > this._currentTerm) {
                            this._logInfo('VoteRequestRPC Reply has term greater than current term. Becoming Follower');
                            this._currentTerm = resultTerm;
                            this._prevTerm = resultTerm;
                            clearTimeout(this._electionTimeout);
                            this._nodeState = NodeState.FOLLOWER;
                            return;
                        }
                        if (voteGranted === true) {
                            voteCount[0] += 1;
                        }
                        if (2 * voteCount[0] > (this._peerCount + 1)) {
                            clearTimeout(this._electionTimeout);
                            this._initiateLeaderState();
                            this._logInfo('Won the election');
                            return;
                        }
                    }
                });
            });
        } catch (err) {
            this._logError('Error while conducting election: ' + err);
        }
    }
}

export { RaftServer, NodeState };
