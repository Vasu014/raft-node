import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { ProtoGrpcType } from './grpc-js/proto/ping';
import { PingServiceHandlers } from './grpc-js/proto/ping/PingService';
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

/**
 * Service implementation for Ping Service
 */
const serviceHandler: PingServiceHandlers = {
    SendHeartbeat: (call, callback) => {
        console.log('Received PingRequest: ' + JSON.stringify(call.request));
        callback(null, { 'pingresponse': 'ok' });
    }
}

function getServer(): grpc.Server {
    const server = new grpc.Server();
    server.addService(loadedPackageDefinition.ping.PingService.service, {
        SendHeartbeat: serviceHandler.SendHeartbeat
    });
    return server;
}

const pingServer = getServer();
pingServer.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    pingServer.start();
    console.log('Ping Server.. Listening at: 0.0.0.0:50051');
});
