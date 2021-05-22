import { AppendEntryRequest__Output } from './grpc-js/proto/raft/AppendEntryRequest';
type Complete<T> = {
    [P in keyof T]:  T[P] 
}

let something: Complete<AppendEntryRequest__Output>;



