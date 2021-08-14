import { logger } from './logger/Logger';
import { LogStore } from './LogStore';
import { IAppendRequest, IAppendResponse, IVoteRequest, IVoteResponse } from './validators/validators';
import { GRPCClientAdapter } from './adapters/GRPCClientAdapter';

enum NodeState {
    FOLLOWER = 'FOLLOWER',
    CANDIDATE = 'CANDIDATE',
    LEADER = 'LEADER'
}

interface LogEntry {
    term: number;
    key: number;
}

class Peer {
    id: number;
    addr: string;
    constructor(id: number, addr: string) {
        this.id = id;
        this.addr = addr;
    }
}

class ConsensusModule {
    private serverId: number;
    private heartbeatTimeout: any;
    private heartbeatSenderTimeout: any;
    private electionTimeout: any;
    private maxElectionRetry: number;
    private nodeState: NodeState;
    private peers: Peer[];



    // Persistent state (Should be updated on stable storage before replying to RPC)
    currentTerm: number; // latest term seen by server
    private prevTerm: number;
    private votedFor: number | null; // vote for the latest election
    private logStore: LogStore; // commands for fsm, {command, term}, 1-indexed
    private peerClients: Map<number, GRPCClientAdapter>;
    // Volatile state [leader state only]
    private nextIndex: Map<any, any>; // for each server, index of next to be sent, [leader lastLogIndex+1,)
    private matchIndex: Map<any, any>; // for each server, index of highest entry known to be replicated [0,)


    constructor(id: number, peers: Peer[]) {
        this.serverId = id;
        this.nodeState = NodeState.FOLLOWER;
        this.peers = peers;
        this.electionTimeout = -1;
        this.maxElectionRetry = 10;
        this.heartbeatTimeout = -1;
        this.currentTerm = 0;
        this.prevTerm = 0;
        this.votedFor = null;
        this.logStore = new LogStore(this.serverId);
        this.nextIndex = new Map();
        this.matchIndex = new Map();
        this.resetHeartbeatTimeout();
        this.currentTerm = 0;
        this.peerClients = new Map<number, GRPCClientAdapter>();
    }


    getCurrentState(): NodeState {
        return this.nodeState;
    }


    getId(): number {
        return this.serverId;
    }


    getCurrentTerm(): number {
        return this.currentTerm;
    }


    logInfo(msg: string): void {
        logger.info('Server ' + this.serverId + ': ' + msg);
    }


    logError(msg: string): void {
        logger.error('Server' + this.serverId + ': ' + msg);
    }

    getCurrentParameters() {
        return {
            currentTerm: this.currentTerm,
            latestEntry: this.logStore.getLatestEntry(),
            currentState: this.nodeState
        }
    }

    setupPeerClients() {
        this.peers.forEach(peer => {
            const peerId = peer.id;
            const peerAddr = peer.addr;
            const newClient: GRPCClientAdapter = new GRPCClientAdapter(peerAddr);
            this.peerClients.set(peerId, newClient);
        });
    }

    /**
     * Timer which waits for Leader Heartbeat, while server is in FOLLOWER state.
     * On timeout, state change to CANDIDATE and leader-election is initiated
     */
    resetElectionTimeout() {
        const threshold = process.env.ELECTIONTIMEOUT ? parseInt(process.env.ELECTIONTIMEOUT) : 1000;
        this.electionTimeout = setTimeout(() => {
            this.resetElectionTimeout();
        }, threshold);
    }


    /**
     * Timer which waits for Leader Heartbeat, while server is in FOLLOWER state.
     * On timeout, state change to CANDIDATE and leader-election is initiated
     */
    resetHeartbeatTimeout() {
        const threshold = process.env.HEARTBEATTIMEOUT ? parseInt(process.env.HEARTBEATTIMEOUT) : 2000;

        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = setTimeout(() => {
            this.logInfo('Heartbeat timed out. Moving to Candidate and starting election');
            if (this.nodeState === NodeState.FOLLOWER) {
                this.nodeState = NodeState.CANDIDATE;
                this.conductLeaderElection();
            }
        }, threshold);
    }

    // TODO: Move to RaftNode
    async sendHeartbeats() {
        this.logInfo('Sending heartbeats to all peers');
        let counter = 0
        for (let peer of Array.from(this.peerClients.entries())) {
            this.logInfo('Sending heartbeat to Server: ' + peer[0]);

            const client = peer[1];
            const request: IAppendRequest = {
                term: this.currentTerm,
                leaderId: this.serverId,
                prevLogIndex: this.logStore.getLastApplied(),
                prevLogTerm: this.currentTerm - 1,
                leaderCommit: 0,//TODO: Fix this
                entries: []
            }
            client.appendEntries(request
            ).then(
                result => {

                    this.logInfo('Received result: ' + JSON.stringify(result));
                    counter += 1;
                    if (counter === this.peers.length) {
                        this.heartbeatSenderTimeout = setTimeout(() => this.sendHeartbeats(), 1000);
                    }
                }
            ).catch(err => {

                this.logInfo('Error while sending heartbeat: ' + err);

            });
        };

    }

    // Todo: Edit for consensus module
    async processHeartbeats(leaderId: number, term: number): Promise<boolean> {
        try {
            if (this.nodeState === NodeState.FOLLOWER) {
                this.logInfo('Heartbeat received from current leader: ' + leaderId);
                this.logInfo('Resetting heartbeat timeout');
                this.resetHeartbeatTimeout();
                return true;

            }
            if (this.nodeState === NodeState.CANDIDATE) {
                this.nodeState = NodeState.FOLLOWER;
                this.currentTerm = term;
                this.prevTerm = term;
                this.logInfo('Heartbeat received from current leader: ' + leaderId);
                this.logInfo('Moving to FOLLOWER state. Resetting heartbeat timeout');
                this.resetHeartbeatTimeout();
                return true;

            }
            // TODO: Handle NodeState.Leader 
            return false;

        } catch (err) {
            this.logError('Error while processing heartbeat: ' + err);
            return false;
        }
    }


    // Todo: refactor for consensus module
    voteRequestHandler(request: IVoteRequest): IVoteResponse {

        const response: IVoteResponse = {
            voteGranted: false,
            term: this.currentTerm
        }
        if (this.nodeState !== NodeState.FOLLOWER) {
            this.logInfo('Received a vote request from ' + request.candidateId);

            if (request.term && request.term < this.currentTerm) {
                return response;
            }
            if (request.candidateId && (request.candidateId == this.votedFor || this.votedFor == null)) {
                this.votedFor = request.candidateId;
                response.voteGranted = true;
                return response;

            } else {
                return response
            }

        } else {
            return response;
        }
    }


    // Todo: refactor for consensus module
    async appendEntriesHandler(request: IAppendRequest): Promise<IAppendResponse> {

        const response: IAppendResponse = {
            term: this.currentTerm,
            success: false
        }
        // handle heartbeats
        if (request.entries.length === 0) {
            const status = await this.processHeartbeats(request.leaderId || -1, request.term);
            response.success = true;
            return response;
        }
        // Otherwise it is an AppendLog request, handle all the cases for it.
        if (this.nodeState == NodeState.FOLLOWER) {
            if (this.currentTerm > request.term) {
                this.logInfo('Current Term is greater than the leader term');
                return response;
            }
            const appendStatus: boolean = await this.logStore.processEntry(request.prevLogIndex, request.prevLogTerm, request.entries[0]);
            response.success = appendStatus;
            return response;
        }
        return response;

    }

    // Todo: Re
    initiateLeaderState() {
        this.nodeState = NodeState.LEADER;

        this.prevTerm = this.currentTerm;
        this.nextIndex = new Map<number, number>();
        this.matchIndex = new Map<number, number>();
        const lastIndex = this.logStore.getLastApplied();
        this.peers.forEach(peer => {
            this.nextIndex.set(peer.id, lastIndex + 1)
            this.matchIndex.set(peer.id, 0);
        });

        if (this.heartbeatSenderTimeout == null) {
            this.heartbeatSenderTimeout = setTimeout(() => this.sendHeartbeats(), 1000);
        }

        this.logInfo('Moved to  state: LEADER');
    }


    // Leader election logic. Election is conducted when server moves to CANDIDATE state. 
    async conductLeaderElection(): Promise<void> {
        this.logInfo('Starting Leader election');
        if (this.prevTerm == this.currentTerm) {
            this.currentTerm += 1;
        }
        //TODO: Make this equal self id and randomize heartbeat timeouts to prevent deadlock elections.
        this.votedFor = null;
        const voteCount = [1];
        this.electionTimeout = setTimeout(() => this.conductLeaderElection(), 2000);
        try {
            for (let peer of Array.from(this.peerClients.entries())) {
                const client = peer[1];
                const request: IVoteRequest = {
                    term: this.currentTerm,
                    candidateId: this.serverId,
                    lastLogIndex: this.logStore.getCommitIndex(),
                    lastLogTerm: 0
                };
                client.requestVote(request).then(result => {
                    if (result.term > this.currentTerm) {
                        this.logInfo('VoteRequestRPC Reply has term greater than current term. Becoming Follower');
                        this.currentTerm = result.term;
                        this.prevTerm = result.term;
                        clearTimeout(this.electionTimeout);
                        this.nodeState = NodeState.FOLLOWER;
                        return;
                    }
                    if (result.voteGranted === true) {
                        voteCount[0] += 1;
                    }
                    if (2 * voteCount[0] > (this.peers.length + 1)) {
                        clearTimeout(this.electionTimeout);
                        this.initiateLeaderState();
                        this.logInfo('Won the election');
                        return;
                    }

                }).catch((err) => {
                    this.logError('Received Error in gRPC Reply' + err);
                });
            };
        } catch (err) {
            this.logError('Error while conducting election: ' + err);
        }
    }
}

export { ConsensusModule, NodeState };
