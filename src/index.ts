//import { ConsensusModule, NodeState } from './ConsensusModule';
import { logger } from './logger/Logger';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Peer } from './Peer';
import { RaftNode } from './RaftNode';
import { raftFactory } from './RaftFactory';

dotenv.config();

/**
 * This file serves as cluster manager for a RAFT network.
 */



const config = fs.readFileSync(__dirname + '/config/node_config.json');
const configJSON = JSON.parse(config.toString());
logger.info(JSON.stringify(configJSON));

const peers: Peer[] = configJSON.nodelist.map((node: any) => {
    return new Peer(node.id, node.ip);
})

const raftNodes: RaftNode[] = [];
for (let i = 1; i <= peers.length; i++) {
    const newNode = raftFactory.buildRaftNode(peers, i);
    raftNodes.push(newNode);
}

logger.info(raftNodes);
//const

/* function hasReachedConsensus(cluster: ConsensusModule[]) {
    const leaders = cluster.filter((server) => {
        logger.info('Server ID: ' + server.getId() + ', State: ' + server.getCurrentState());
        if (server.getCurrentState() === NodeState.LEADER) {
            return server;
        }
    });
    const uniqueLeaders = leaders.filter((value, idx, arr) => arr.indexOf(value) == idx);
    if (uniqueLeaders.length === 1) {
        logger.info('Leader Elected: ' + uniqueLeaders[0]);
        return uniqueLeaders[0];
    } else {
        logger.info('No consensus yet. Waiting...');
        setTimeout(() => hasReachedConsensus(cluster), 1000);
    }
} */

/* const cluster: ConsensusModule[] = serverId.map((id, index) => {
    return new ConsensusModule(id, ips[index]);
})

logger.info('Welcome to RAFT Cluster Module. starting servers, and connecting to peers');
cluster.forEach(server => server.initiatePeerConnections(serverId, idAddrMap));
setTimeout(() => hasReachedConsensus(cluster), 100);
 */
