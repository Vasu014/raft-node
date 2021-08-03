import { RaftServer, NodeState } from './../src/RaftServer';
import * as dotEnv from 'dotenv';


afterEach(() => {
    jest.useRealTimers();

});

describe('Running RaftServer Node sanity checks', () => {

    const server = new RaftServer(1, 'http://localhost:3550');
    it('should have initial state as FOLLOWER', () => {
        expect(server.getCurrentState()).toBe(NodeState.FOLLOWER);
    });

    it('should have currentTerm === 0', () => {
        expect(server.getCurrentTerm()).toBe(0);
    });

    it('should shutdown only after all peer client connections have been closed', () => {
        const mock = jest.fn();
    });

    it('should switch to CANDIDATE state on heartbeat timeout', () => {
        jest.useFakeTimers();
        server._resetHeartbeatTimeout();
        jest.advanceTimersByTime(2001)
        expect(server.getCurrentState()).toBe(NodeState.CANDIDATE);

    });

    it('should restart election if election times out', () => {

    });

    it('should switch to FOLLOWER state if it receives a heartbeat during the election process', () => {

    });

    it('should stay in FOLLOWER state if it receives a heartbeat before timeout', () => {

    });

    server.shutDown();

});
