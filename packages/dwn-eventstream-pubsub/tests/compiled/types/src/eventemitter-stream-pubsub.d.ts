import type { EventListener, EventStream, EventSubscription, MessageEvent } from '@tbd54566975/dwn-sdk-js';
import type { KeyValues } from './types.js';
export interface EventEmitterStreamConfig {
    /**
     * An optional error handler in order to be able to react to any errors or warnings triggers by `EventEmitter`.
     * By default we log errors with `console.error`.
     */
    errorHandler?: (error: any) => void;
}
export declare class EventEmitterStream implements EventStream {
    isOpen: boolean;
    projectId: string;
    constructor(config?: EventEmitterStreamConfig);
    /**
     * we subscribe to the `EventEmitter` error handler with a provided handler or set one which logs the errors.
     */
    private errorHandler;
    subscribe(tenant: string, id: string, listener: EventListener): Promise<EventSubscription>;
    private getTopicName;
    private getSubscriptionName;
    open(): Promise<void>;
    close(): Promise<void>;
    emit(tenant: string, event: MessageEvent, indexes: KeyValues): Promise<void>;
}
//# sourceMappingURL=eventemitter-stream-pubsub.d.ts.map