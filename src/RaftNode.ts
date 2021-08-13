import { ConsensusModule } from './ConsensusModule';
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { ProtoGrpcType } from './grpc-js/proto/raft';
import * as dotenv from 'dotenv';
import { logger } from './logger/Logger';
import { RaftServiceHandlers, RaftServiceClient } from './grpc-js/proto/raft/RaftService';

dotenv.config();
const PROTO_PATH = './../proto/raft.proto';
const packageDefinition = protoLoader.loadSync(
    __dirname + PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });


const loadedPackageDefinition = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

interface Peer {
    _id: number;
    _address: string;

}

class RaftNode {
    private _nodeId: number;
    private _rpcServer: grpc.Server;
    private _cm: ConsensusModule;
    private _peers: Peer[];
    private _peerClients: Map<number, grpc.Client>;

    constructor(id: number, cm: ConsensusModule, rpcServer: grpc.Server, peers: Peer[]) {
        this._nodeId = id;
        this._cm = cm;
        this._rpcServer = rpcServer;
        this._peers = peers;
        this._peerClients = new Map<number, grpc.Client>();
    }

    _logInfo(msg: string): void {
        logger.info('Server ' + this._nodeId + ': ' + msg);
    }


    _logError(msg: string): void {
        logger.error('Server' + this._nodeId + ': ' + msg);
    }

    _disconnectPeer(peerId: number) {
        const peerClient = this._peerClients.get(peerId);
        if (!!peerClient) {
            peerClient.close();
            return;
        }
        this._logError('Peer Id does not exist. Cannot close');
    }

    _initiatePeerConnections(peerIds: number[], idAddrMap: Map<number, string>) {
        this._peers.forEach((peer: Peer) => {
            this._logInfo('Connecting to Server: ' + peer._id);
            //const clientAddr: string = value != undefined ? value : '';
            const client: RaftServiceClient = new loadedPackageDefinition.raft.RaftService(peer._address, grpc.credentials.createInsecure());
            this._peerClients.set(peer._id, client);
        });

    }

    _setupHandlers() {

    }

    _shutdown() { }
}

export { RaftNode }; 
