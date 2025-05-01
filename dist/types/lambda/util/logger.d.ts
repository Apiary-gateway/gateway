import { RoutingLog } from './types';
export declare class Logger {
    private static ddb;
    private requestStartTime;
    private is_successful;
    private user_id;
    private metadata;
    private success_reason;
    private error_reason;
    private model_routing_history;
    private thread_id;
    private provider;
    private model;
    private cost;
    private raw_request;
    private raw_response;
    private error_message;
    constructor();
    private log;
    setRawRequest(rawRequest: string): void;
    setInitialData(threadId: string, userId: string | undefined, metadata: string): void;
    logSuccessData(model: string, provider: string, modelRoutingHistory: RoutingLog, successReason: string, rawResponse: string): Promise<void>;
    logErrorData(errorReason: string, errorMessage: string): Promise<void>;
}
