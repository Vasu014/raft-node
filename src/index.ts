import { RaftServer, NodeState } from './RaftServer';
import { logger } from './logger/Logger';
import * as dotenv from 'dotenv';


dotenv.config();
const serverId = [1, 2, 3, 4];
const ips = [5001, 5002, 5003, 5004].map(ip => {
    return 'localhost:' + ip.toString()
});
const idAddrMap = new Map<number, string>();
serverId.forEach((val, idx) => {
    idAddrMap.set(val, ips[idx]);
});

const cluster: RaftServer[] = serverId.map((id, index) => {
    return new RaftServer(id, ips[index]);
})


const getLeader = () => {
    cluster.forEach(server => {
        if (server.getCurrentState() == NodeState.LEADER) {
            return server.getId();
        }
    })
}

logger.info('Welcome to RAFT Cluster Module. starting servers, and connecting to peers');
cluster.forEach(server => server.initiatePeerConnections(serverId, idAddrMap));
cluster.forEach(async server =>{ server.conductLeaderElection()});
logger.info('Current Leader: ' + getLeader());
