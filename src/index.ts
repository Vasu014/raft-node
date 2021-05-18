import {RaftServer} from './RaftServer';
import * as dotenv from 'dotenv';


dotenv.config();
const serverId = [1,2,3,4];
const cluster: RaftServer[] = serverId.map(id => {
    return new RaftServer(id, '');
})

cluster.forEach(server => server.startHeartbeats());