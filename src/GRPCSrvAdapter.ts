import * as grpc from "@grpc/grpc-js";
import { logger } from './logger/Logger';
import { ConsensusModule } from "./ConsensusModule";
import { AppendRequestRPC, IAppendRequest, IAppendResponse, RequestVoteRPC, IVoteRequest, IVoteResponse } from './validators/validators';
import { loadedPackageDefinition } from './package/definition';

class GRPCSrvAdapter {
    private _server: grpc.Server;
    private _serverId: number;
    private _cm: ConsensusModule;
    constructor(cm: ConsensusModule, id: number) {
        this._serverId = id;
        this._server = new grpc.Server();
        this._cm = cm;
    }


    _logInfo(msg: string): void {
        logger.info('Server ' + this._serverId + ': ' + msg);
    }


    _logError(msg: string): void {
        logger.error('Server' + this._serverId + ': ' + msg);
    }


    /**
     * We initialize all the servers in the cluster, and assign them localhost/addresses.
     */
    _initializeServer(addr: string): void {
        const server = new grpc.Server();
        this._setupHandlers();
        server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), (err, port) => {
            server.start();
            this._server = server;
        });
    }


    _setupHandlers() {
        this._server.addService(loadedPackageDefinition.raft.RaftService.service, {
            RequestVote: async (call: any, cb: any) => {
                const { error, value } = RequestVoteRPC.validate(call.request);
                if (error) {
                    return cb(new Error('Illegal request state'), { term: this._cm.currentTerm, voteGranted: false });
                }

                const request: IVoteRequest = value;
                try {
                    const response: IVoteResponse = await this._cm._voteRequestHandler(request);
                    return cb(null, { term: this._cm.currentTerm, voteGranted: response.status });
                } catch (err) {
                    return cb(new Error, { term: this._cm.currentTerm, voteGranted: false });
                }
            },
            // TODO: Implement Append Entries handler in ConsensusModule and Here
            AppendEntries: async (call: any, cb: any) => {
                const { error, value } = AppendRequestRPC.validate(call.request);
                if (error) {
                    return cb(new Error('Illegal request state'), { term: this._cm.currentTerm, success: false });
                }

                const request: IAppendRequest = value;
            }
        });
    }

    shutDown() {
        this._logInfo('Disconnecting all peer connections');
        //this.disconnectAllPeers();
        this._server.tryShutdown((err) => {
            if (err) {
                this._logError('Error while trying to shutdown server: ' + err);
                throw new Error(err.message);
            }
            this._logInfo('Server shutdown successfully.');
        })
    }
}

export { GRPCSrvAdapter };
 