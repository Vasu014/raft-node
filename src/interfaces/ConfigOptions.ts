import { NodeState } from './../ConsensusModule';
export interface ConfigOptions {
    initialState: NodeState;
    heartbeatTimeout: number;
    electionTimeout: number;
    votedFor: number | null;
    currentTerm: number;
}
