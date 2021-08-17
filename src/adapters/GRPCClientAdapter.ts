
import * as grpc from "@grpc/grpc-js";
import { logger } from './../logger/Logger';
import { loadedPackageDefinition } from './../package/definition';
import { AppendRequestRPC, IAppendRequest, IAppendResponse, RequestVoteRPC, ResponseVoteRPC, IVoteRequest, IVoteResponse } from './../validators/validators';
import { RaftServiceClient } from "./../grpc-js/proto/raft/RaftService";


class GRPCClientAdapter {
    private grpcClient: RaftServiceClient;

    constructor(clientAddr: string) {
        this.grpcClient = new loadedPackageDefinition.raft.RaftService(clientAddr, grpc.credentials.createInsecure());
    }

    requestVote(request: IVoteRequest): Promise<IVoteResponse> {
        return new Promise((resolve, reject) => {
            this.grpcClient.RequestForVote(request, (err, response) => {
                if (err) {
                    return reject(err);
                }
                const { error, value } = RequestVoteRPC.validate(response);
                const reply: IVoteResponse = value;
                return resolve(reply);
            });
        });
    }

    appendEntries(request: IAppendRequest): Promise<IAppendResponse> {
        return new Promise((resolve, reject) => {
            this.grpcClient.AppendEntries(request, (err, response) => {
                if (err) {
                    return reject(err);
                }
                const { error, value } = AppendRequestRPC.validate(response);
                if (error) {
                    return reject(error);
                }
                const reply: IAppendResponse = value;
                return resolve(reply);
            });
        });
    }

    close() {
        this.grpcClient.close();
    }
}

export { GRPCClientAdapter };
