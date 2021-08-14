import * as grpc from "@grpc/grpc-js";
import { logger } from './../logger/Logger';
import { ConsensusModule } from "./../ConsensusModule";
import { AppendRequestRPC, IAppendRequest, IAppendResponse, RequestVoteRPC, IVoteRequest, IVoteResponse } from './../validators/validators';
import { loadedPackageDefinition } from './../package/definition';


class GRPCSrvAdapter {
    private server: grpc.Server;
    private serverId: number;
    private cm: ConsensusModule;

    constructor(cm: ConsensusModule, id: number) {
        this.serverId = id;
        this.server = new grpc.Server();
        this.cm = cm;
    }


    logInfo(msg: string): void {
        logger.info('Server ' + this.serverId + ': ' + msg);
    }


    logError(msg: string): void {
        logger.error('Server' + this.serverId + ': ' + msg);
    }


    /**
     * We initialize all the servers in the cluster, and assign them localhost/addresses.
     */
    initializeServer(addr: string): void {
        const server = new grpc.Server();
        this.setupHandlers();
        server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), (err, port) => {
            server.start();
            this.server = server;
        });
    }


    setupHandlers() {
        this.server.addService(loadedPackageDefinition.raft.RaftService.service, {
            RequestVote: async (call: any, cb: any) => {
                const { error, value } = RequestVoteRPC.validate(call.request);
                if (error) {
                    return cb(new Error('Illegal request state'), { term: this.cm.currentTerm, voteGranted: false });
                }

                const request: IVoteRequest = value;
                try {
                    const response: IVoteResponse = await this.cm.voteRequestHandler(request);
                    return cb(null, { term: this.cm.currentTerm, voteGranted: response.voteGranted });
                } catch (err) {
                    return cb(new Error, { term: this.cm.currentTerm, voteGranted: false });
                }
            },
            // TODO: Implement Append Entries handler in ConsensusModule and Here
            AppendEntries: async (call: any, cb: any) => {
                const { error, value } = AppendRequestRPC.validate(call.request);
                if (error) {
                    return cb(new Error('Illegal request state'), { term: this.cm.currentTerm, success: false });
                }

                const request: IAppendRequest = value;
            }
        });
    }

    shutDown() {
        this.logInfo('Disconnecting all peer connections');
        //this.disconnectAllPeers();
        this.server.tryShutdown((err) => {
            if (err) {
                this.logError('Error while trying to shutdown server: ' + err);
                throw new Error(err.message);
            }
            this.logInfo('Server shutdown successfully.');
        })
    }
}

export { GRPCSrvAdapter };
