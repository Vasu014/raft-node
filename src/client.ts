const PROTO_PATH = './../proto/ping.proto';
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { ProtoGrpcType } from './grpc-js/proto/ping';
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
const client = new loadedPackageDefinition.ping.PingService('localhost:50051', grpc.credentials.createInsecure());

client.SendHeartbeat({ 'pingrequest': 'PING_REQUEST' }, (err, res) => {
    if (err) {
        console.error('Error while making gRPC call:' + err);
    } else {
        console.log('Received gRPC Server Response : ' + JSON.stringify(res, null, 1));
    }
});
