import { AppendEntryRequest__Output } from './grpc-js/proto/raft/AppendEntryRequest';

class LogEntry {
    term: number | undefined
}
type Complete<T> = {
    [P in keyof T]-?: T[P] extends undefined ? never : T[P]
}

let something: Complete<LogEntry>;
