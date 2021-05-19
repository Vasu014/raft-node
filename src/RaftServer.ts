import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { ProtoGrpcType } from './grpc-js/proto/ping';
import { PingServiceHandlers } from './grpc-js/proto/ping/PingService';
import { setInterval } from 'timers';

const PROTO_PATH = './../proto/ping.proto';
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

enum NodeState{
    FOLLOWER = 'FOLLOWER',
    CANDIDATE = 'CANDIDATE',
    LEADER = 'LEADER'
}

class RaftServer {
    private serverId: number;
    private nodeIds: number[];
    private idToAddrMap: Map<number, string>;
    private server: grpc.Server;
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
        this.server = this.initializeServer();
        this.nodeIds = [];
        this.idToAddrMap = new Map<number, string>();
        this.heartbeatTimer = '';
        this.nodeState = NodeState.FOLLOWER;

        this.currentTerm = 0;
        this.votedFor = null;
        this.log = []

        this.commitIndex = 0;
        this.lastApplied = 0;

        this.nextIndex = [];
        this.matchIndex = [];
    }

    initializeServer() {
        const server = new grpc.Server();
        const serviceHandler = this.createServiceHandlers();
        server.addService(loadedPackageDefinition.ping.PingService.service, {
            SendHeartbeat: serviceHandler.SendHeartbeat
        });

        return server;
    }

    connectToPeers(ids: number[], ips: string[]) {
        this.nodeIds = ids.filter(id => id != this.serverId);
        this.nodeIds.forEach(id => {
            console.log('\x1b[34m%s\x1b[0m', 'Server ' + this.serverId + ': Connecting to Node Id: ' + id);
        })

    }

    createServiceHandlers() {
        const serviceHandler: PingServiceHandlers = {
            SendHeartbeat: (call, callback) => {
                console.log('Received PingRequest: ' + JSON.stringify(call.request));
                callback(null, { 'pingresponse': 'PING_OK' });
            }
        }
        return serviceHandler;

    }

    startHeartbeats() {
        this.heartbeatTimer = setInterval(() => {
            console.log('\x1b[36m%s\x1b[0m','Heartbeat for Server Id: ' + this.serverId);
        }, 1000);
    }
}

export { RaftServer };
