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
    private _serverId: number;
    private _heartbeatTimeout: any;
    private _heartbeatSenderTimeout: any;
    private _electionTimeout: any;
    private _maxElectionRetry: number;
    private _nodeState: NodeState;
    private _peers: Peer[];
    currentTerm: number;


    // Persistent state (Should be updated on stable storage before replying to RPC)
    private _currentTerm: number; // latest term seen by server
    private _prevTerm: number;
    private _votedFor: number | null; // vote for the latest election
    private _logStore: LogStore; // commands for fsm, {command, term}, 1-indexed
    private _peerClients: Map<number, GRPCClientAdapter>;
    // Volatile state [leader state only]
    private _nextIndex: Map<any, any>; // for each server, index of next to be sent, [leader lastLogIndex+1,)
    private _matchIndex: Map<any, any>; // for each server, index of highest entry known to be replicated [0,)


    constructor(id: number, peers: Peer[]) {
        this._serverId = id;
        this._nodeState = NodeState.FOLLOWER;
        this._peers = peers;
        this._electionTimeout = -1;
        this._maxElectionRetry = 10;
        this._heartbeatTimeout = -1;
        this._currentTerm = 0;
        this._prevTerm = 0;
        this._votedFor = null;
        this._logStore = new LogStore(this._serverId);
        this._nextIndex = new Map();
        this._matchIndex = new Map();
        this._resetHeartbeatTimeout();
        this.currentTerm = 0;
        this._peerClients = new Map<number, GRPCClientAdapter>();
    }


    getCurrentState(): NodeState {
        return this._nodeState;
    }


    getId(): number {
        return this._serverId;
    }


    getCurrentTerm(): number {
        return this._currentTerm;
    }


    _logInfo(msg: string): void {
        logger.info('Server ' + this._serverId + ': ' + msg);
    }


    _logError(msg: string): void {
        logger.error('Server' + this._serverId + ': ' + msg);
    }

    getCurrentParameters() {
        return {
            currentTerm: this._currentTerm,
            latestEntry: this._logStore.getLatestEntry(),
            currentState: this._nodeState
        }
    }

    _setupPeerClients() {
        this._peers.forEach(peer => {
            const peerId = peer.id;
            const peerAddr = peer.addr;
            const newClient: GRPCClientAdapter = new GRPCClientAdapter(peerAddr);
            this._peerClients.set(peerId, newClient);
        });
    }

    /**
     * Timer which waits for Leader Heartbeat, while server is in FOLLOWER state.
     * On timeout, state change to CANDIDATE and leader-election is initiated
     */
    _resetElectionTimeout() {
        const threshold = process.env.ELECTION_TIMEOUT ? parseInt(process.env.ELECTION_TIMEOUT) : 1000;
        this._electionTimeout = setTimeout(() => {
            this._resetElectionTimeout();
        }, threshold);
    }


    /**
     * Timer which waits for Leader Heartbeat, while server is in FOLLOWER state.
     * On timeout, state change to CANDIDATE and leader-election is initiated
     */
    _resetHeartbeatTimeout() {
        const threshold = process.env.HEARTBEAT_TIMEOUT ? parseInt(process.env.HEARTBEAT_TIMEOUT) : 2000;

        clearTimeout(this._heartbeatTimeout);
        this._heartbeatTimeout = setTimeout(() => {
            this._logInfo('Heartbeat timed out. Moving to Candidate and starting election');
            if (this._nodeState === NodeState.FOLLOWER) {
                this._nodeState = NodeState.CANDIDATE;
                this._conductLeaderElection();
            }
        }, threshold);
    }

    // TODO: Move to RaftNode
    async _sendHeartbeats() {
        this._logInfo('Sending heartbeats to all peers');
        let counter = 0
        for (let peer of Array.from(this._peerClients.entries())) {
            this._logInfo('Sending heartbeat to Server: ' + peer[0]);

            const client = peer[1];
            const request: IAppendRequest = {
                term: this._currentTerm,
                leaderId: this._serverId,
                prevLogIndex: this._logStore.getLastApplied(),
                prevLogTerm: this._currentTerm - 1,
                leaderCommit: 0,//TODO: Fix this
                entries: []
            }
            client.appendEntries(request
            ).then(
                result => {

                    this._logInfo('Received result: ' + JSON.stringify(result));
                    counter += 1;
                    if (counter === this._peers.length) {
                        this._heartbeatSenderTimeout = setTimeout(() => this._sendHeartbeats(), 1000);
                    }
                }
            ).catch(err => {

                this._logInfo('Error while sending heartbeat: ' + err);

            });
        };

    }

    // Todo: Edit for consensus module
    async _processHeartbeats(leaderId: number, term: number): Promise<boolean> {
        try {
            if (this._nodeState === NodeState.FOLLOWER) {
                this._logInfo('Heartbeat received from current leader: ' + leaderId);
                this._logInfo('Resetting heartbeat timeout');
                this._resetHeartbeatTimeout();
                return true;

            }
            if (this._nodeState === NodeState.CANDIDATE) {
                this._nodeState = NodeState.FOLLOWER;
                this._currentTerm = term;
                this._prevTerm = term;
                this._logInfo('Heartbeat received from current leader: ' + leaderId);
                this._logInfo('Moving to FOLLOWER state. Resetting heartbeat timeout');
                this._resetHeartbeatTimeout();
                return true;

            }
            // TODO: Handle NodeState.Leader 
            return false;

        } catch (err) {
            this._logError('Error while processing heartbeat: ' + err);
            return false;
        }
    }


    // Todo: refactor for consensus module
    _voteRequestHandler(request: IVoteRequest): IVoteResponse {

        const response: IVoteResponse = {
            voteGranted: false,
            term: this.currentTerm
        }
        if (this._nodeState !== NodeState.FOLLOWER) {
            this._logInfo('Received a vote request from ' + request.candidateId);

            if (request.term && request.term < this._currentTerm) {
                return response;
            }
            if (request.candidateId && (request.candidateId == this._votedFor || this._votedFor == null)) {
                this._votedFor = request.candidateId;
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
    async _appendEntriesHandler(request: IAppendRequest): Promise<IAppendResponse> {

        const response: IAppendResponse = {
            term: this._currentTerm,
            success: false
        }
        // handle heartbeats
        if (request.entries.length === 0) {
            const status = await this._processHeartbeats(request.leaderId || -1, request.term);
            response.success = true;
            return response;
        }
        // Otherwise it is an AppendLog request, handle all the cases for it.
        if (this._nodeState == NodeState.FOLLOWER) {
            if (this._currentTerm > request.term) {
                this._logInfo('Current Term is greater than the leader term');
                return response;
            }
            const appendStatus: boolean = await this._logStore.processEntry(request.prevLogIndex, request.prevLogTerm, request.entries[0]);
            response.success = appendStatus;
            return response;
        }
        return response;

    }

    // Todo: Re
    _initiateLeaderState() {
        this._nodeState = NodeState.LEADER;

        this._prevTerm = this._currentTerm;
        this._nextIndex = new Map<number, number>();
        this._matchIndex = new Map<number, number>();
        const lastIndex = this._logStore.getLastApplied();
        this._peers.forEach(peer => {
            this._nextIndex.set(peer.id, lastIndex + 1)
            this._matchIndex.set(peer.id, 0);
        });

        if (this._heartbeatSenderTimeout == null) {
            this._heartbeatSenderTimeout = setTimeout(() => this._sendHeartbeats(), 1000);
        }

        this._logInfo('Moved to  state: LEADER');
    }


    // Leader election logic. Election is conducted when server moves to CANDIDATE state. 
    async _conductLeaderElection(): Promise<void> {
        this._logInfo('Starting Leader election');
        if (this._prevTerm == this._currentTerm) {
            this._currentTerm += 1;
        }
        //TODO: Make this equal self id and randomize heartbeat timeouts to prevent deadlock elections.
        this._votedFor = null;
        const voteCount = [1];
        this._electionTimeout = setTimeout(() => this._conductLeaderElection(), 2000);
        try {
            for (let peer of Array.from(this._peerClients.entries())) {
                const client = peer[1];
                client.requestVote({
                    term: this._currentTerm,
                    candidateId: this._serverId,
                    lastLogIndex: this._logStore.getCommitIndex(),
                    lastLogTerm: 0
                }).then(result => {


                    if (result.term > this._currentTerm) {
                        this._logInfo('VoteRequestRPC Reply has term greater than current term. Becoming Follower');
                        this._currentTerm = result.term;
                        this._prevTerm = result.term;
                        clearTimeout(this._electionTimeout);
                        this._nodeState = NodeState.FOLLOWER;
                        return;
                    }
                    if (result.voteGranted === true) {
                        voteCount[0] += 1;
                    }
                    if (2 * voteCount[0] > (this._peers.length + 1)) {
                        clearTimeout(this._electionTimeout);
                        this._initiateLeaderState();
                        this._logInfo('Won the election');
                        return;
                    }

                }).catch((err) => {
                    this._logError('Received Error in gRPC Reply' + err);
                });
            };
        } catch (err) {
            this._logError('Error while conducting election: ' + err);
        }
    }
}

export { ConsensusModule, NodeState };
