import * as grpc from '@grpc/grpc-js';
import { ServiceDefinition, EnumTypeDefinition, MessageTypeDefinition } from '@grpc/proto-loader';

import { RaftServiceClient as _raft_RaftServiceClient, RaftServiceDefinition as _raft_RaftServiceDefinition } from './raft/RaftService';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  google: {
    protobuf: {
      ListValue: MessageTypeDefinition
      NullValue: EnumTypeDefinition
      Struct: MessageTypeDefinition
      Value: MessageTypeDefinition
    }
  }
  raft: {
    AppendEntryRequest: MessageTypeDefinition
    AppendResponse: MessageTypeDefinition
    LogEntry: MessageTypeDefinition
    RaftService: SubtypeConstructor<typeof grpc.Client, _raft_RaftServiceClient> & { service: _raft_RaftServiceDefinition }
    VoteRequest: MessageTypeDefinition
    VoteResponse: MessageTypeDefinition
  }
}

