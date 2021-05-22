// Original file: proto/raft.proto

import  { LogEntry as _raft_LogEntry, LogEntry__Output as _raft_LogEntry__Output } from '../raft/LogEntry';

export interface AppendEntryRequest {
  'term'?: (number);
  'leaderId'?: (number);
  'prevLogIndex'?: (number);
  'prevLogTerm'?: (number);
  'entries'?: (_raft_LogEntry)[];
  'leaderCommit'?: (number);
}

export interface AppendEntryRequest__Output {
  'term'?: (number);
  'leaderId'?: (number);
  'prevLogIndex'?: (number);
  'prevLogTerm'?: (number);
  'entries'?: (_raft_LogEntry__Output)[];
  'leaderCommit'?: (number);
}
