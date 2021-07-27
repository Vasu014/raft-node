import { RaftServer, NodeState } from './../src/RaftServer';


describe('Running RaftServer Node sanity checks', () => {
    const server = new RaftServer(1, 'http://localhost:3550');

    it('should have initial state as FOLLOWER', () => {
        expect(server.getCurrentState()).toBe(NodeState.FOLLOWER);
    })
});