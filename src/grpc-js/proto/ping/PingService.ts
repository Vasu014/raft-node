// Original file: proto/ping.proto

import * as grpc from '@grpc/grpc-js'
import { MethodDefinition } from '@grpc/proto-loader'
import { PingRequest as _ping_PingRequest, PingRequest__Output as _ping_PingRequest__Output } from '../ping/PingRequest';
import { PingResponse as _ping_PingResponse, PingResponse__Output as _ping_PingResponse__Output } from '../ping/PingResponse';

export interface PingServiceClient extends grpc.Client {
  SendHeartbeat(argument: _ping_PingRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _ping_PingResponse__Output) => void): grpc.ClientUnaryCall;
  SendHeartbeat(argument: _ping_PingRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _ping_PingResponse__Output) => void): grpc.ClientUnaryCall;
  SendHeartbeat(argument: _ping_PingRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _ping_PingResponse__Output) => void): grpc.ClientUnaryCall;
  SendHeartbeat(argument: _ping_PingRequest, callback: (error?: grpc.ServiceError, result?: _ping_PingResponse__Output) => void): grpc.ClientUnaryCall;
  sendHeartbeat(argument: _ping_PingRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _ping_PingResponse__Output) => void): grpc.ClientUnaryCall;
  sendHeartbeat(argument: _ping_PingRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _ping_PingResponse__Output) => void): grpc.ClientUnaryCall;
  sendHeartbeat(argument: _ping_PingRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _ping_PingResponse__Output) => void): grpc.ClientUnaryCall;
  sendHeartbeat(argument: _ping_PingRequest, callback: (error?: grpc.ServiceError, result?: _ping_PingResponse__Output) => void): grpc.ClientUnaryCall;
  
}

export interface PingServiceHandlers extends grpc.UntypedServiceImplementation {
  SendHeartbeat: grpc.handleUnaryCall<_ping_PingRequest__Output, _ping_PingResponse>;
  
}

export interface PingServiceDefinition extends grpc.ServiceDefinition {
  SendHeartbeat: MethodDefinition<_ping_PingRequest, _ping_PingResponse, _ping_PingRequest__Output, _ping_PingResponse__Output>
}
