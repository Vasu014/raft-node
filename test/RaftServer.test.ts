import { RaftServer, NodeState } from './../src/RaftServer';


describe('Running RaftServer Node sanity checks', () => {
    const server = new RaftServer(1, 'http://localhost:3550');

    it('should have initial state as FOLLOWER', () => {
        expect(server.getCurrentState()).toBe(NodeState.FOLLOWER);
    })

    it('should have currentTerm === 0', () => {
        expect(server.getCurrentTerm()).toBe(0);
    })

    it('should shutdown only after all peer client connections have been closed', () => {

    })
});
