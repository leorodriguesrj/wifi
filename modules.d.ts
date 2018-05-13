declare module 'unix-dgram' {
    import * as events from 'events';

    export function createSocket(type: 'unix_dgram', listener?: (message: Buffer) => void): Socket;

    export interface Socket extends events.EventEmitter {
        bind(path: string): void;
        connect(path: string): void;
        send(buf: Buffer, callback?: (err?: number, message?: string) => void): void;
        send(buf: Buffer, offset: number, length: number, path: string, callback?: (err: number, message: string) => void): void;
        close(): void;
    }
}
