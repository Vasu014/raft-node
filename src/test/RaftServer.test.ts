import { raftFactory } from './../RaftFactory';
import { logger } from './../logger/Logger';
import { NodeState } from './../ConsensusModule';
import { peers } from './data/peers';
import { GRPCClientAdapter } from './../adapters/GRPCClientAdapter';
import { IAppendRequest } from './../interfaces/Rpc';
import { RaftNode } from './../RaftNode';
import * as dotEnv from 'dotenv';
import { ConfigOptions } from '../interfaces/ConfigOptions';

jest.setTimeout(10000);
dotEnv.config();
beforeAll(() => {
    logger.silent = true;
});

let raftNode: RaftNode;
describe('Running RaftNode unit tests', () => {
    beforeEach(() => {
        const config: ConfigOptions = {
            initialState: NodeState.FOLLOWER,
            heartbeatTimeout: Number(process.env.HEARTBEATTIMEOUT) | 1000,
            electionTimeout: Number(process.env.ELECTION_TIMEOUT) | 500,
            votedFor: null,
            currentTerm: 0
        };
        raftNode = raftFactory.buildRaftNode(peers, 1, config);

    });

    // 1. General initial state
    it('should have initial state as FOLLOWER', () => {

        expect(raftNode.getState()).toBe(NodeState.FOLLOWER);
    });

    it('should have currentTerm === 0', () => {

        expect(raftNode.getCurrentTerm()).toBe(0);
    });

    //2. Heartbeat Related
    it('should have heartbeat timeout === ' + process.env.HEARTBEATTIMEOUT, () => {

        expect(raftNode.getHeartbeatTimeout()).toBe(Number(process.env.HEARTBEATTIMEOUT));
    });

    it('should switch to CANDIDATE state on heartbeat timeout', (done) => {
        let delta = Number(process.env.HEARTBEATTIMEOUT);
        delta += 1;
        setTimeout(() => {
            expect(raftNode.getState()).toBe(NodeState.CANDIDATE);
            done();
        }, delta);
    });

    // Note: There has to be a better way to test this haha...
    it('should reset heartbeat timeout (i.e stay in FOLLOWER) state if it receives a heartbeat before timeout', (done) => {
        const config: ConfigOptions = {
            initialState: NodeState.FOLLOWER,
            votedFor: 1,
            currentTerm: 1,
            heartbeatTimeout: Number(process.env.HEARTBEATTIMEOUT) | 1000,
            electionTimeout: Number(process.env.ELECTION_TIMEOUT) | 500
        };
        const testNode = raftFactory.buildRaftNode(peers, 2, config);
        testNode.startGrpc().then(res => {
            // Initialize raftNode in Follower State, with LeaderID as 2
            const clientAdapter = new GRPCClientAdapter('0.0.0.0:3600');


            // Create heartbeat request
            const appendRequest: IAppendRequest = {
                term: 1,
                leaderId: 1,
                leaderCommit: 1,
                prevLogTerm: 0,
                prevLogIndex: 0,
                entries: []
            };

            // Send heartbeat request after time = HEARTBEATTIMEOUT / 2
            const delta = parseInt('1000', 10);
            logger.info('Will test for sanity after: ' + Math.floor(delta / 2));
            logger.info('Will test for sanity after: ' + (delta + Math.floor(delta / 2)));
            setTimeout(() => {

                clientAdapter.appendEntries(appendRequest).then(response => {
                    logger.info(response);
                });



            }, Math.floor(delta / 2));

            // Validate state after time = 1.5 x HEARTBEATTIMEOUT
            setTimeout(() => {

                expect(testNode.getState()).toBe(NodeState.FOLLOWER);
                clientAdapter.close();
                testNode.shutdown().then(res => {
                    return done();
                });

            }, (delta + Math.floor(delta / 2)));
        });


    });

    it('should switch to FOLLOWER state if it receives a heartbeat during the election process', () => {
    });

    it.todo('should shutdown only after all peer client connections have been closed');

    it.todo('')

    // 3. Election timeouts
    it('should restart election if election times out', () => {
        // 1. Initialize a node in Candidate State
        // 2. Run fake timer past Election Timeout
        // 3. Check function call count for conductElection
    });

    afterEach(() => {
        raftNode.shutdown();
    });
});


afterAll(() => {
    console.log('After All Executed')
    logger.silent = false;
});
