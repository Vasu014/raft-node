// Original file: proto/raft.proto


export interface VoteRequest {
  'term'?: (number);
  'candidateId'?: (number);
  'lastLogIndex'?: (number);
  'lastLogTerm'?: (number);
}

export interface VoteRequest__Output {
  'term'?: (number);
  'candidateId'?: (number);
  'lastLogIndex'?: (number);
  'lastLogTerm'?: (number);
}
