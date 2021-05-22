import { RaftServer } from './RaftServer';
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



cluster.forEach(server => server.initiatePeerConnections(serverId, idAddrMap));
cluster.forEach(server => server.conductLeaderElection());


const timer = setTimeout(() => {}, 2000);
clearTimeout(timer);
