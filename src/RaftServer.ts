import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { ProtoGrpcType } from './grpc-js/proto/raft';
import * as dotenv from 'dotenv';
import { logger } from './logger/Logger';
import { RaftServiceHandlers, RaftServiceClient } from './grpc-js/proto/raft/RaftService';


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
 * 
 */
class RaftServer {
    private serverId: number;
    private nodeIds: number[];
    private idToAddrMap: Map<number, string>;
    private idToClientMap: Map<number, RaftServiceClient>;
    private server: grpc.Server = new grpc.Server();
    private heartbeatTimeout: any;
    private heartbeatSenderTimeout: any;
    private electionTimeout: any;
    private nodeState: NodeState;

    // Persistent state (Should be updated on stable storage before replying to RPC)
    private currentTerm: number; // latest term seen by server
    private votedFor: number | null; // vote for the latest election
    private log: LogEntry[]; // commands for fsm, {command, term}, 1-indexed

    // Volatile state [all servers]
    private commitIndex: number; // highest known commit index [0,)
    private lastApplied: number; // index of highest log applied to fsm [0,)

    // Volatile state [leader state only]
    private nextIndex: number[]; // for each server, index of next to be sent, [leader lastLogIndex+1,)
    private matchIndex: number[]; // for each server, index of highest entry known to be replicated [0,)


    constructor(serverId: number, serverAddr: string) {
        this.serverId = serverId;
        this.nodeIds = [];
        this.idToAddrMap = new Map<number, string>();
        this.idToClientMap = new Map<number, RaftServiceClient>();
        this.nodeState = NodeState.FOLLOWER;
        this.electionTimeout = -1;
        this.heartbeatTimeout = -1;
        this.currentTerm = 0;
        this.votedFor = null;
        this.log = []

        this.commitIndex = 0;
        this.lastApplied = 0;

        this.nextIndex = [];
        this.matchIndex = [];
        this.initializeServer(serverAddr);
        this.resetHeartbeatTimeout();


    }

    logInfo(msg: string): void {
        logger.info('Server ' + this.serverId + ': ' + msg);
    }

    getCurrentState(): NodeState {
        return this.nodeState;
    }


    getId(): number {
        return this.serverId;
    }


    /**
     * We initialize all the servers in the cluster, and assign them localhost/addresses.
     */
    initializeServer(addr: string): void {
        const server = new grpc.Server();
        const serviceHandler = this.createServiceHandlers();
        server.addService(loadedPackageDefinition.raft.RaftService.service, {
            RequestForVote: serviceHandler.RequestForVote,
            AppendEntries: serviceHandler.AppendEntries
        });

        server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), (err, port) => {
            server.start();
            this.server = server;
        });
    }


    /**
     * Timer which waits for Leader Heartbeat, while server is in FOLLOWER state.
     * On timeout, state change to CANDIDATE and leader-election is initiated
     */
    resetElectionTimeout() {
        const threshold = process.env.ELECTION_TIMEOUT ? parseInt(process.env.ELECTION_TIMEOUT) : 1000;
        this.electionTimeout = setTimeout(() => {
            this.resetElectionTimeout();
        }, threshold);
    }


    /**
     * Timer which waits for Leader Heartbeat, while server is in FOLLOWER state.
     * On timeout, state change to CANDIDATE and leader-election is initiated
     */
    resetHeartbeatTimeout() {
        const threshold = process.env.HEARTBEAT_TIMEOUT ? parseInt(process.env.HEARTBEAT_TIMEOUT) : 2000;
        this.heartbeatTimeout = setTimeout(() => {
            this.logInfo('Heartbeat timed out. Moving to Candidate and starting election');
            if (this.nodeState === NodeState.FOLLOWER) {
                this.nodeState = NodeState.CANDIDATE;
                this.conductLeaderElection();
            }
        }, threshold);
    }


    async sendHeartbeats() {
        this.logInfo('Sending heartbeats to all peers');
        let counter = 0
        this.nodeIds.forEach(id => {
            this.logInfo('Sending heartbeat to Server: ' + id);
            if (!this.idToClientMap.has(id)) {
                this.logInfo('Error!! No Client present for server id: ' + id);
                return;
            }
            const client = this.idToClientMap.get(id);
            client?.AppendEntries(
                {
                    term: this.currentTerm,
                    leaderId: this.serverId,
                    prevLogIndex: this.lastApplied,
                    prevLogTerm: this.currentTerm - 1,
                    entries: []
                },
                (err, result) => {
                    if (err) {
                        this.logInfo('Error while sending heartbeat: ' + err);
                    }
                    this.logInfo('Received result: ' + JSON.stringify(result));
                    counter += 1;
                    if (counter === this.nodeState.length) {
                        this.heartbeatSenderTimeout = setTimeout(() => this.sendHeartbeats(), 1000);
                    }
                }
            )
        });

    }


    // Once all servers are up and running, we connect each servers to it's N-1 peers
    initiatePeerConnections(peerIds: number[], idAddrMap: Map<number, string>) {
        this.nodeIds = peerIds.filter(id => id != this.serverId);
        this.nodeIds.forEach(id => {
            this.logInfo('Connecting to Server: ' + id);
            const value = idAddrMap.get(id);
            const clientAddr: string = value != undefined ? value : '';
            const client: RaftServiceClient = new loadedPackageDefinition.raft.RaftService(clientAddr, grpc.credentials.createInsecure());
            this.idToClientMap.set(id, client);
            this.idToAddrMap.set(id, clientAddr);
        });

    }


    // TODO: Use conditional types for typechecking for optional and undefined values
    createServiceHandlers() {
        const serviceHandlers: RaftServiceHandlers = {
            RequestForVote: (call, cb) => {
                const request = call.request;
                if (this.nodeState !== NodeState.FOLLOWER) {
                    this.logInfo('Received a vote request from ' + request.candidateId);
                    //logger.info('Current votedFor: ' + this.votedFor);
                    if (request.candidateId && (request.candidateId == this.votedFor || this.votedFor == null)) {
                        this.votedFor = request.candidateId;
                        cb(null, { term: this.currentTerm, voteGranted: true });
                    } else {
                        cb(null, { term: this.currentTerm, voteGranted: false });
                    }

                } else {
                    cb(null, { term: this.currentTerm, voteGranted: false });
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

                if (this.nodeState === NodeState.FOLLOWER) {
                    this.logInfo('Heartbeat received from current leader: ' + request.leaderId);
                    this.logInfo('Resetting heartbeat timeout');
                    this.resetHeartbeatTimeout()
                    cb(null, { term: this.currentTerm, success: true });
                } else if (this.nodeState === NodeState.CANDIDATE) {
                    this.nodeState = NodeState.FOLLOWER;
                    this.logInfo('Heartbeat received from current leader: ' + request.leaderId);
                    this.logInfo('Moving to FOLLOWER state. Resetting heartbeat timeout');
                    this.resetHeartbeatTimeout();
                    cb(null, { term: this.currentTerm, success: true });
                }

            }
        }

        return serviceHandlers;
    }


    // Write logs to persistent state if conditions are correct
    // Todo 1: Handle case when leaderTerm/leaderIdx is ahead of your last idx
    async appendLogs(prevLogIdx: number, prevLogTerm: number, leaderTerm: number, entries: LogEntry[]): Promise<boolean> {
        const logLength = this.log.length;
        if (logLength == prevLogIdx + 1 && this.log[logLength - 1].term == prevLogTerm) {
            this.log = this.log.concat(entries);
            return true
        } else {
            return false;
        }
    }


    // Leader election logic. Election is conducted when server moves to CANDIDATE state. 
    async conductLeaderElection(): Promise<void> {
        this.logInfo('Starting Leader election');
        this.currentTerm += 1;
        this.votedFor = null; //Ideally this should be self, and heartbeat timeouts should be random to prevent clashes.
        const voteCount = [1];
        try {
            this.nodeIds.forEach(id => {
                const client = this.idToClientMap.get(id);
                client?.RequestForVote({
                    term: this.currentTerm,
                    candidateId: this.serverId,
                    lastLogIndex: this.commitIndex,
                    lastLogTerm: 0
                }, (err, result) => {
                    if (err) {
                        console.error('Received Error' + err);
                    } else {
                        if (result?.voteGranted) {
                            voteCount[0] += 1;
                        }
                        if (voteCount[0] > 2) {
                            this.nodeState = NodeState.LEADER;
                            this.heartbeatSenderTimeout = setTimeout(() => this.sendHeartbeats(), 1000);
                            this.logInfo('Elected as LEADER');

                        }
                    }
                })
            });
        } catch (err) {

        }
    }
}

export { RaftServer, NodeState };
