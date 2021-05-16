import * as grpc from '@grpc/grpc-js';
import  { ServiceDefinition, EnumTypeDefinition, MessageTypeDefinition } from '@grpc/proto-loader';
import { PingServiceClient as _ping_PingServiceClient, PingServiceDefinition as _ping_PingServiceDefinition } from './ping/PingService';

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
  ping: {
    PingRequest: MessageTypeDefinition
    PingResponse: MessageTypeDefinition
    PingService: SubtypeConstructor<typeof grpc.Client, _ping_PingServiceClient> & { service: _ping_PingServiceDefinition }
  }
}

