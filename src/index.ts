import { RaftServer, NodeState } from './RaftServer';
import { logger } from './logger/Logger';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * This file serves as cluster manager for a RAFT network.
 */

const serverId = [1, 2, 3, 4];
const ips = [5001, 5002, 5003, 5004].map(ip => {
    return 'localhost:' + ip.toString()
});
const idAddrMap = new Map<number, string>();
serverId.forEach((val, idx) => {
    idAddrMap.set(val, ips[idx]);
});




function hasReachedConsensus(cluster: RaftServer[]) {
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
}

const cluster: RaftServer[] = serverId.map((id, index) => {
    return new RaftServer(id, ips[index]);
})

logger.info('Welcome to RAFT Cluster Module. starting servers, and connecting to peers');
cluster.forEach(server => server.initiatePeerConnections(serverId, idAddrMap));
setTimeout(() => hasReachedConsensus(cluster), 100);

