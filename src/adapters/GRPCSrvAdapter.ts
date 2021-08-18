import * as grpc from "@grpc/grpc-js";
import { logger } from './../logger/Logger';
import { ConsensusModule } from "./../ConsensusModule";
import { AppendRequestRPC, RequestVoteRPC } from './../validators/validators';
import { IAppendRequest, IAppendResponse, IVoteRequest, IVoteResponse } from './../interfaces/Rpc';
import { loadedPackageDefinition } from './../package/definition';


class GRPCSrvAdapter {
    private server: grpc.Server;
    private serverId: number;
    private addr: string;
    private cm: ConsensusModule;

    constructor(cm: ConsensusModule, id: number, addr: string) {
        this.serverId = id;
        this.server = new grpc.Server();
        this.addr = addr;
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
    initializeServer(): Promise<boolean> {
        this.setupHandlers();
        logger.info('Trying to bind to address: ' + this.addr);
        return new Promise((resolve, reject) => {
            this.server.bindAsync(this.addr, grpc.ServerCredentials.createInsecure(), (err, port) => {
                if (err) {
                    logger.error('Error while start grpc server at: ' + this.addr + ', Error: ' + err);
                    return reject(false);
                }
                logger.info('Listening at address: ' + '0.0.00:' + port);
                this.server.start();
                return resolve(true);
            });
        })

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
                    return cb(new Error(err), { term: this.cm.currentTerm, voteGranted: false });
                }
            },
            // TODO: Implement Append Entries handler in ConsensusModule and Here
            AppendEntries: async (call: any, cb: any) => {
                logger.info('Received append request lol: ' + JSON.stringify(call.request));
                const { error, value } = AppendRequestRPC.validate(call.request);
                if (error) {
                    return cb(new Error('Illegal request state'), { term: this.cm.currentTerm, success: false });
                }

                const request: IAppendRequest = value;
                try {
                    const response: IAppendResponse = await this.cm.appendEntriesHandler(request);
                    return cb(null, { term: response.term, success: response.success });
                } catch (err) {
                    return cb(new Error(err), { term: this.cm.currentTerm, voteGranted: false });
                }
            }
        });
    }


    shutDown(): Promise<void> {
        this.logInfo('Disconnecting all peer connections');
        //this.disconnectAllPeers();
        return new Promise((resolve, reject) => {
            this.server.forceShutdown();
            this.logInfo('Shut down successful');
            this.server = new grpc.Server();
            resolve();

        });
    }
}

export { GRPCSrvAdapter };
