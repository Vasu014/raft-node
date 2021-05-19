import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { ProtoGrpcType } from './grpc-js/proto/raft';
import { RaftServiceHandlers, RaftServiceClient } from './grpc-js/proto/raft/RaftService';
import { setInterval } from 'timers';

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

class RaftServer {
    private serverId: number;
    private nodeIds: number[];
    private idToAddrMap: Map<number, string>;
    private idToClientMap: Map<number, RaftServiceClient>;
    private server: grpc.Server = new grpc.Server();
    private heartbeatTimer: any;
    private nodeState: NodeState;

    // Persistent state
    private currentTerm: number;
    private votedFor: number | null;
    private log: number[];

    // Volatile state [all servers]
    private commitIndex: number;
    private lastApplied: number;

    // Volatile state [leader state only]
    private nextIndex: number[];
    private matchIndex: number[];


    constructor(serverId: number, serverAddr: string) {
        this.serverId = serverId;
        this.nodeIds = [];
        this.idToAddrMap = new Map<number, string>();
        this.idToClientMap = new Map<number, RaftServiceClient>();
        this.heartbeatTimer = '';
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

    initializeServer(addr: string): void {
        const server = new grpc.Server();
        const serviceHandler = this.createServiceHandlers();
        server.addService(loadedPackageDefinition.raft.RaftService.service, {
            RequestForVote: serviceHandler.RequestForVote,
            AppendEntries: serviceHandler.AppendEntries
        });

        server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), (err, port) => {
            server.start();
            this.server =  server;
        });

    }

    initiatePeerConnections(peerIds: number[], idAddrMap: Map<number, string>) {
        this.nodeIds = peerIds.filter(id => id != this.serverId);
        this.nodeIds.forEach(id => {
            console.log('Connecting Sevrer ' + this.serverId + ' to Server' + id);
            const value = idAddrMap.get(id);
            const clientAddr: string = value != undefined ? value : '';
            const client = new loadedPackageDefinition.raft.RaftService(clientAddr, grpc.credentials.createInsecure());
            this.idToClientMap.set(id, client);
            this.idToAddrMap.set(id, clientAddr);
        });

    }

    createServiceHandlers() {
        const serviceHandlers: RaftServiceHandlers = {
            RequestForVote: (call, cb) => {
                const request = call.request;
                if (this.nodeState == NodeState.FOLLOWER) {
                    console.log('Server ' + this.serverId + ' Received a vote request from ' + request.candidateId);
                    console.log('Current votedFor: ' + this.votedFor);
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
            AppendEntries: (call, cb) => {
                // TODO: Implementation Pending
            }
        }

        return serviceHandlers;
    }

    startHeartbeats(): void {
        this.heartbeatTimer = setInterval(() => {
            console.log('\x1b[36m%s\x1b[0m', 'Heartbeat for Server Id: ' + this.serverId);
        }, 1000);
    }

    conductLeaderElection(): void {
        console.log('Starting Leader election for : ' + this.serverId);
        const voteCount = [0];
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
                        if (voteCount[0] >= 2) {
                            this.nodeState = NodeState.LEADER;
                            console.log('Leader Elected: ' + this.serverId);
                        }
                    }
                }
            })

        });

    }
}

export { RaftServer };
