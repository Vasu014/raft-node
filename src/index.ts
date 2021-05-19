import {RaftServer} from './RaftServer';
import * as dotenv from 'dotenv';


dotenv.config();
const serverId = [1,2,3,4];
const ips = [5001, 5002, 5003, 5004].map(ip => {
    return 'localhost:' + ip.toString()
});
const cluster: RaftServer[] = serverId.map(id => {
    return new RaftServer(id, '');
})

cluster.forEach(server => server.startHeartbeats());
cluster.forEach(server => server.connectToPeers(serverId, ips));
