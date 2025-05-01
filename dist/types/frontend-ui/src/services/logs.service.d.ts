import { LogsResponse } from '../types/logs.types';
export declare const API_BASE_URL: string;
export declare const getLogsFromDynamo: (nextToken: string | null) => Promise<LogsResponse>;
export declare const getLogsFromAthena: (nextToken: string | null, queryExecutionId: string | null) => Promise<{
    logs: {
        id?: string | null | undefined;
        metadata?: string | null | undefined;
        timestamp?: string | null | undefined;
        latency?: string | number | null | undefined;
        success_reason?: string | null | undefined;
        error_reason?: string | null | undefined;
        model_routing_history?: string | any[] | null | undefined;
        user_id?: string | null | undefined;
        thread_id?: string | null | undefined;
        cost?: string | number | null | undefined;
        raw_request?: string | null | undefined;
        raw_response?: string | null | undefined;
        error_message?: string | null | undefined;
        is_successful?: string | boolean | null | undefined;
        provider?: string | null | undefined;
        model?: string | null | undefined;
    }[];
    pageSize: number;
    nextToken?: string | null | undefined;
    queryExecutionId?: string | null | undefined;
}>;
