// Original file: proto/raft.proto

import * as grpc from '@grpc/grpc-js'
import { MethodDefinition } from '@grpc/proto-loader'
import { AppendEntryRequest as _raft_AppendEntryRequest, AppendEntryRequest__Output as _raft_AppendEntryRequest__Output } from '../raft/AppendEntryRequest';
import { AppendResponse as _raft_AppendResponse, AppendResponse__Output as _raft_AppendResponse__Output } from '../raft/AppendResponse';
import { VoteRequest as _raft_VoteRequest, VoteRequest__Output as _raft_VoteRequest__Output } from '../raft/VoteRequest';
import { VoteResponse as _raft_VoteResponse, VoteResponse__Output as _raft_VoteResponse__Output } from '../raft/VoteResponse';

export interface RaftServiceClient extends grpc.Client {
  AppendEntries(argument: _raft_AppendEntryRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _raft_AppendResponse__Output) => void): grpc.ClientUnaryCall;
  AppendEntries(argument: _raft_AppendEntryRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _raft_AppendResponse__Output) => void): grpc.ClientUnaryCall;
  AppendEntries(argument: _raft_AppendEntryRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _raft_AppendResponse__Output) => void): grpc.ClientUnaryCall;
  AppendEntries(argument: _raft_AppendEntryRequest, callback: (error?: grpc.ServiceError, result?: _raft_AppendResponse__Output) => void): grpc.ClientUnaryCall;
  appendEntries(argument: _raft_AppendEntryRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _raft_AppendResponse__Output) => void): grpc.ClientUnaryCall;
  appendEntries(argument: _raft_AppendEntryRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _raft_AppendResponse__Output) => void): grpc.ClientUnaryCall;
  appendEntries(argument: _raft_AppendEntryRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _raft_AppendResponse__Output) => void): grpc.ClientUnaryCall;
  appendEntries(argument: _raft_AppendEntryRequest, callback: (error?: grpc.ServiceError, result?: _raft_AppendResponse__Output) => void): grpc.ClientUnaryCall;

  RequestForVote(argument: _raft_VoteRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _raft_VoteResponse__Output) => void): grpc.ClientUnaryCall;
  RequestForVote(argument: _raft_VoteRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _raft_VoteResponse__Output) => void): grpc.ClientUnaryCall;
  RequestForVote(argument: _raft_VoteRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _raft_VoteResponse__Output) => void): grpc.ClientUnaryCall;
  RequestForVote(argument: _raft_VoteRequest, callback: (error?: grpc.ServiceError, result?: _raft_VoteResponse__Output) => void): grpc.ClientUnaryCall;
  requestForVote(argument: _raft_VoteRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _raft_VoteResponse__Output) => void): grpc.ClientUnaryCall;
  requestForVote(argument: _raft_VoteRequest, metadata: grpc.Metadata, callback: (error?: grpc.ServiceError, result?: _raft_VoteResponse__Output) => void): grpc.ClientUnaryCall;
  requestForVote(argument: _raft_VoteRequest, options: grpc.CallOptions, callback: (error?: grpc.ServiceError, result?: _raft_VoteResponse__Output) => void): grpc.ClientUnaryCall;
  requestForVote(argument: _raft_VoteRequest, callback: (error?: grpc.ServiceError, result?: _raft_VoteResponse__Output) => void): grpc.ClientUnaryCall;

}

export interface RaftServiceHandlers extends grpc.UntypedServiceImplementation {
  AppendEntries: grpc.handleUnaryCall<_raft_AppendEntryRequest__Output, _raft_AppendResponse>;

  RequestForVote: grpc.handleUnaryCall<_raft_VoteRequest__Output, _raft_VoteResponse>;

}

export interface RaftServiceDefinition extends grpc.ServiceDefinition {
  AppendEntries: MethodDefinition<_raft_AppendEntryRequest, _raft_AppendResponse, _raft_AppendEntryRequest__Output, _raft_AppendResponse__Output>
  RequestForVote: MethodDefinition<_raft_VoteRequest, _raft_VoteResponse, _raft_VoteRequest__Output, _raft_VoteResponse__Output>
}
