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

class RaftServer {
    private serverId: number;
    private nodeIds: number[];
    private idToAddrMap: Map<number, string>;
    private idToClientMap: Map<number, RaftServiceClient>;
    private server: grpc.Server = new grpc.Server();
    private heartbeatTimer: any;
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
        this.heartbeatTimer = -1;
        this.nodeState = NodeState.FOLLOWER;

        this.currentTerm = 0;
        this.votedFor = null;
        this.log = []

        this.commitIndex = 0;
        this.lastApplied = 0;

        this.nextIndex = [];
        this.matchIndex = [];

        this.initializeServer(serverAddr);
    }

    getCurrentState(): NodeState {
        return this.nodeState;
    }

    getId(): number {
        return this.serverId;
    }

    // We initialize all the servers in the cluster, and assign them localhost/ addresses.
    initializeServer(addr: string): grpc.Server {
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
        return this.server;
    }

    // Once all servers are up and running, we connect each servers to it's N-1 peers
    initiatePeerConnections(peerIds: number[], idAddrMap: Map<number, string>) {
        this.nodeIds = peerIds.filter(id => id != this.serverId);
        this.nodeIds.forEach(id => {
            logger.info('Connecting Server: ' + this.serverId + ', to Server: ' + id);
            const value = idAddrMap.get(id);
            const clientAddr: string = value != undefined ? value : '';
            const client = new loadedPackageDefinition.raft.RaftService(clientAddr, grpc.credentials.createInsecure());
            this.idToClientMap.set(id, client);
            this.idToAddrMap.set(id, clientAddr);
        });

    }

    // TODO: Use conditional types for typechecking for optional and undefined values
    createServiceHandlers() {
        const serviceHandlers: RaftServiceHandlers = {
            RequestForVote: (call, cb) => {
                const request = call.request;
                if (this.nodeState == NodeState.FOLLOWER) {
                    //logger.info('Server ' + this.serverId + ' Received a vote request from ' + request.candidateId);
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

            // TODO: Handle when RPC is just a heartbeat, with empty entries[]
            AppendEntries: async (call, cb) => {
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

                if (term == -1) {
                    cb(new Error('Term Not Present'), { term: this.currentTerm, success: false });
                }
                if (this.currentTerm > term) {
                    cb(null, { term: this.currentTerm, success: false })
                }
                if (this.nodeState == NodeState.CANDIDATE && request.term && request.term >= this.currentTerm) {
                    this.nodeState = NodeState.FOLLOWER;
                    this.startHeartbeatTimer();
                    const appendResult = await this.appendLogs(prevLogIndex, prevLogTerm, term, entries);
                    return cb(null, { term: this.currentTerm, success: appendResult });
                }
                if (this.nodeState == NodeState.FOLLOWER) {
                    clearTimeout(this.heartbeatTimer);
                    this.startHeartbeatTimer();
                    const appendResult = await this.appendLogs(prevLogIndex, prevLogTerm, term, entries);
                    cb(null, { term: this.currentTerm, success: appendResult });
                }
                if (this.nodeState == NodeState.LEADER && term > this.currentTerm) {

                    this.nodeState = NodeState.FOLLOWER;
                    this.startHeartbeatTimer()
                    const appendResult = await this.appendLogs(prevLogIndex, prevLogTerm, term, entries);
                    cb(null, { term: this.currentTerm, success: appendResult });
                }
            }
        }

        return serviceHandlers;
    }


    // Timer which waits for Leader Heartbeat, while server is in FOLLOWER state.
    // On timeout, state change to CANDIDATE and leader-election is initiated
    startHeartbeatTimer() {
        const threshold = process.env.HEARTBEAT_TIMEOUT ? parseInt(process.env.HEARTBEAT_TIMEOUT) : 1000;
        this.heartbeatTimer = setTimeout(() => {
            this.nodeState = NodeState.CANDIDATE;
            this.conductLeaderElection();
        }, threshold);
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
        logger.info('Starting Leader election for : ' + this.serverId);
        this.currentTerm += 1;
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
                            logger.info('Leader Elected: ' + this.serverId);
                        }
                    }
                })
            });
        } catch (err) {

        }
    }


}

export { RaftServer, NodeState };
