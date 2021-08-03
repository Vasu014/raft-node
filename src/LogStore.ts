import { logger } from './logger/Logger';


interface LogEntry {
    term: number;
    key: number;
}


class LogStore {
    private serverId: number;
    private entries: LogEntry[];

    // Volatile state [all servers]
    private commitIndex: number;
    private lastApplied: number;


    constructor(id: number) {
        this.serverId = id;
        this.commitIndex = 0;
        this.lastApplied = 0
        this.entries = new Array<LogEntry>();
    }

    _logInfo(msg: string): void {
        logger.info('LogStore ' + this.serverId + ': ' + msg);
    }

    _logError(msg: string): void {
        logger.error('LogStore' + this.serverId + ': ' + msg);
    }

    getLatestEntry(): LogEntry {
        return this.entries[-1];
    }

    getCommitIndex(): number {
        return this.commitIndex;
    }

    getLastApplied(): number {
        return this.lastApplied;
    }


    async processEntry(prevLogIdx: number, prevTerm: number, entry: LogEntry): Promise<boolean> {
        logger.info('Inside appendEntry method');
        try {

            if (prevLogIdx > this.lastApplied) {
                this._logInfo('Log array is too small to append new leader value');
                return false;
            }

            const lastEntry: LogEntry = this.entries[this.lastApplied];
            if (this.lastApplied > prevLogIdx) {
                this.entries.splice(prevLogIdx + 2);
            }

            this.entries.push({
                term: entry.term,
                key: entry.key
            });
            this.lastApplied += 1;
            // TODO: Handle commitIndex
            return true;

        } catch (err) {
            this._logError('Error occured while log append operation: ' + err);
            return false;
        }
    }

}


export { LogStore };