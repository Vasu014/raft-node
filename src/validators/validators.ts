import * as joi from 'joi';

const AppendRequestRPC = joi.object({
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

