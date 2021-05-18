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

class RaftServer {
    private serverId: number;
    private nodeIds: number[];
    private idToAddrMap: Map<number, string>;
    private server: grpc.Server;
    private heartbeatTimer: any;

    constructor(serverId: number, serverAddr: string) {
        this.serverId = serverId;
        this.server = this.initializeServer();
        this.nodeIds = [];
        this.idToAddrMap =  new Map<number, string>();
        this.heartbeatTimer = '';
    }

    initializeServer() {
        const server = new grpc.Server();
        const serviceHandler = this.createServiceHandlers();
        server.addService(loadedPackageDefinition.ping.PingService.service, {
            SendHeartbeat: serviceHandler.SendHeartbeat
        });

        return server;
    }

    connectToPeers() {

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

    startHeartbeats(){
        this.heartbeatTimer = setInterval(() => {
            console.log('Heartbeat for Server Id: ' + this.serverId);
        }, 1000);
    }
}

export { RaftServer };
