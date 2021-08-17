import { Peer } from './Peer';
import { ConsensusModule, NodeState } from './ConsensusModule';
import { GRPCSrvAdapter } from './adapters/GRPCSrvAdapter';
import { RaftNode } from './RaftNode';
import { ConfigOptions } from './interfaces/ConfigOptions';


class RaftFactory {
    buildRaftNode(serverList: Peer[], serverId: number, opts: ConfigOptions) {
        const peers = serverList.filter(server => server.id !== serverId);
        const server = serverList.filter(server => server.id === serverId)[0];

        const cm = new ConsensusModule(serverId, peers, opts);
        const grpcAdapter = new GRPCSrvAdapter(cm, server.id);
        const raftNode = new RaftNode(serverId, cm, grpcAdapter);
        return raftNode;
    }
}

const raftFactory = new RaftFactory();
export { raftFactory };
