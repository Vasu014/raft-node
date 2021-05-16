import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import {ProtoGrpcType} from './grpc-js/proto/ping';
const PROTO_PATH = './../proto/ping.proto'
const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });

const protoDescriptor = (grpc.loadPackageDefinition(packageDefinition) as unknown) as ProtoGrpcType;
const ping = protoDescriptor.ping;

