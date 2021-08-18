import * as joi from 'joi';

export const AppendRequestRPC = joi.object({
    term: joi.number().required(),
    leaderId: joi.number().required(),
    prevLogIndex: joi.number().required(),
    prevLogTerm: joi.number().required(),
    leaderCommit: joi.number().required(),
    entries: joi.array().items(
        joi.object({
            term: joi.number(),
            key: joi.number()
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
    term: joi.number().required(),
    success: joi.bool().required()
});
