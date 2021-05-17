import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import * as dotenv from 'dotenv';
import { setInterval } from 'timers';
import { ProtoGrpcType } from './grpc-js/proto/ping';
import { PingServiceClient } from './grpc-js/proto/ping/PingService';

dotenv.config();

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

// Get all cluster IPs
const args = require('minimist')(process.argv.slice(2));
const PORT_LIST = process.env.PORT_LIST ? process.env.PORT_LIST.split(',') : [];
const PORT: string = args['server_port'];
const node_addresses = PORT_LIST.filter(curr_port => parseInt(curr_port) !== parseInt(PORT))
    .map(curr_port => 'localhost:' + curr_port);
console.log('Node Addresses: ' + node_addresses);

// Setup clients for all other N-1 nodes
const clientList: PingServiceClient[] = node_addresses.map(nodeAddress => {
    const loadedPackageDefinition = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;
    const client = new loadedPackageDefinition.ping.PingService(nodeAddress, grpc.credentials.createInsecure());
    return client;

});

// Ping all N-1 Clients
clientList.forEach(client => {
    client.SendHeartbeat({ 'pingrequest': 'PING_REQUEST' }, (err, res) => {
        if (err) {
            console.error('Error while making gRPC call:' + err);
        } else {
            console.log('Received gRPC Server Response : ' + JSON.stringify(res, null, 1));
        }
    });
});
