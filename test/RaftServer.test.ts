import { ConsensusModule, NodeState } from '../src/ConsensusModule';
import * as dotEnv from 'dotenv';


afterEach(() => {
    jest.useRealTimers();

});

describe('Running RaftServer Node sanity checks', () => {

    it('should have initial state as FOLLOWER', () => {

    });

    it('should have currentTerm === 0', () => {

    });

    it('should shutdown only after all peer client connections have been closed', () => {
        const mock = jest.fn();
    });

    it('should switch to CANDIDATE state on heartbeat timeout', () => {

    });

    it('should restart election if election times out', () => {

    });

    it('should switch to FOLLOWER state if it receives a heartbeat during the election process', () => {

    });

    it('should stay in FOLLOWER state if it receives a heartbeat before timeout', () => {

    });
});
