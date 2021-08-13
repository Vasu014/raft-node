import * as grpc from "@grpc/grpc-js";
const PROTO_PATH = './../proto/raft.proto';
import * as protoLoader from '@grpc/proto-loader'
import { ProtoGrpcType } from './../grpc-js/proto/raft';

const packageDefinition = protoLoader.loadSync(
    __dirname + PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });

export const loadedPackageDefinition = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;
