export interface IAppendRequest {
    term: number;
    leaderId: number;
    prevLogIndex: number;
    prevLogTerm: number;
    leaderCommit: number;
    entries: {
        term: number,
        key: number
    }[];
};

export interface IVoteRequest {
    term: number;
    candidateId: number;
    lastLogIndex: number;
    lastLogTerm: number;
};

export interface IVoteResponse {
    term: number;
    voteGranted: boolean;
};

export interface IAppendResponse {
    term: number;
    success: boolean;
};
