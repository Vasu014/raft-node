// Original file: proto/raft.proto


export interface AppendEntryRequest {
  'term'?: (number);
  'leaderId'?: (number);
  'prevLogIndex'?: (number);
  'prevLogEntries'?: (number)[];
  'leaderCommit'?: (number);
}

export interface AppendEntryRequest__Output {
  'term'?: (number);
  'leaderId'?: (number);
  'prevLogIndex'?: (number);
  'prevLogEntries'?: (number)[];
  'leaderCommit'?: (number);
}
