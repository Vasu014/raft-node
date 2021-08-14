import * as joi from 'joi';

export const AppendRequestRPC = joi.object({
    term: joi.number().required(),
    leaderId: joi.number().required(),
    prevLogIndex: joi.number().required(),
    prevLogTerm: joi.number().required(),
    leaderCommit: joi.number().required(),
    entries: joi.array().items(
        joi.object({
            term: joi.number().required(),
            key: joi.number().required()
        })
    )
});

export const RequestVoteRPC = joi.object({
    term: joi.number().required(),
    candidateId: joi.number().required(),
    lastLogIndex: joi.number().required(),
    lastLogTerm: joi.number().required(),
});

export const ResponseVoteRPC = joi.object({
    term: joi.number().required(),
    voteGranted: joi.bool().required()
});


export const ResponseAppendRPC = joi.object({

});

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
