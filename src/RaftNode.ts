import { ConsensusModule } from './ConsensusModule';
import { logger } from './logger/Logger';
import { GRPCSrvAdapter } from './adapters/GRPCSrvAdapter';


class RaftNode {
    private nodeId: number;
    private cm: ConsensusModule;
    private grpcAdapter: GRPCSrvAdapter;

    constructor(id: number, cm: ConsensusModule, grpcAdapter: GRPCSrvAdapter) {
        this.nodeId = id;
        this.cm = cm;
        this.grpcAdapter = grpcAdapter;
    }

    logInfo(msg: string): void {
        logger.info('Server ' + this.nodeId + ': ' + msg);
    }

    logError(msg: string): void {
        logger.error('Server' + this.nodeId + ': ' + msg);
    }

    getState() {
        return this.cm.getCurrentState();
    }

    getCurrentTerm() {
        return this.cm.getCurrentTerm();
    }

    getHeartbeatTimeout() {
        return this.cm.getHeartbeatTimeout();
    }

    shutdown() {
        this.grpcAdapter.shutDown();
        this.cm.shutdown();
    }
}

export { RaftNode }; 
