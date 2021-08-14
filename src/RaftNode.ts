import { ConsensusModule } from './ConsensusModule';
import { logger } from './logger/Logger';
import { GRPCSrvAdapter } from './adapters/GRPCSrvAdapter';


class RaftNode {
    private _nodeId: number;
    private _cm: ConsensusModule;
    private _grpcAdapter: GRPCSrvAdapter;

    constructor(id: number, cm: ConsensusModule, grpcAdapter: GRPCSrvAdapter) {
        this._nodeId = id;
        this._cm = cm;
        this._grpcAdapter = grpcAdapter;
    }

    _logInfo(msg: string): void {
        logger.info('Server ' + this._nodeId + ': ' + msg);
    }

    _logError(msg: string): void {
        logger.error('Server' + this._nodeId + ': ' + msg);
    }
}

export { RaftNode }; 
