import { ConsensusModule } from './ConsensusModule';
import { logger } from './logger/Logger';

class RaftNode {
    private _nodeId: number;
    private _cm: ConsensusModule;

    constructor(id: number, cm: ConsensusModule) {
        this._nodeId = id;
        this._cm = cm;
    }

    _logInfo(msg: string): void {
        logger.info('Server ' + this._nodeId + ': ' + msg);
    }

    _logError(msg: string): void {
        logger.error('Server' + this._nodeId + ': ' + msg);
    }
}

export { RaftNode }; 
