import { raftFactory } from './../RaftFactory';
import { logger } from './../logger/Logger';
import { NodeState } from './../ConsensusModule';
import { peers } from './data/peers';
import { RaftNode } from './../RaftNode';
import * as dotEnv from 'dotenv';

dotEnv.config();

beforeAll(() => {

    logger.silent = true;
});

let raftNode: RaftNode;
describe('Running RaftNode unit tests', () => {
    beforeEach(() => {
        const config = {
            initialState: NodeState.FOLLOWER,
            heartbeatTimeout: Number(process.env.HEARTBEATTIMEOUT) | 1000,
            electionTimeout: Number(process.env.ELECTION_TIMEOUT) | 500
        };
        raftNode = raftFactory.buildRaftNode(peers, 1, config);

    });



    it('should have initial state as FOLLOWER', () => {

        expect(raftNode.getState()).toBe(NodeState.FOLLOWER);
    });

    it('should have currentTerm === 0', () => {

        expect(raftNode.getCurrentTerm()).toBe(0);
    });

    it('should have heartbeat timeout === ' + process.env.HEARTBEATTIMEOUT, () => {

        expect(raftNode.getHeartbeatTimeout()).toBe(Number(process.env.HEARTBEATTIMEOUT));
    });

    it('should switch to CANDIDATE state on heartbeat timeout',  (done) => {
        let delta = Number(process.env.HEARTBEATTIMEOUT);
        delta += 1;
        setTimeout(() => {
            expect(raftNode.getState()).toBe(NodeState.CANDIDATE);
            done();
        }, delta);


    });

    it('should restart election if election times out', () => {
        // 1. Initialize a node in Candidate State
        // 2. Run fake timer past Election Timeout
        // 3. Check function call count for conductElection
    });

    it.todo('should reset heartbeat timeout (i.e stay in FOLLOWER) state if it receives a heartbeat before timeout');

    it.todo('should switch to FOLLOWER state if it receives a heartbeat during the election process');

    it.todo('should shutdown only after all peer client connections have been closed');

    afterEach(() => {
        raftNode.shutdown();
    });
});


afterAll(() => {

    logger.silent = false;
});
