import { RouteRequestArgs, SupportedLLMs, ModelForProvider, RoutingLog as RoutingLogType } from './types';
import { CompletionResponse } from 'token.js';
export declare function routeRequest({ history, prompt, provider, model, metadata, userId }: Omit<RouteRequestArgs, 'log'>): Promise<{
    text: string;
    usage: CompletionResponse['usage'];
    provider: SupportedLLMs;
    model: ModelForProvider<SupportedLLMs>;
    log: RoutingLogType;
    simpleCacheHit?: boolean;
    semanticCacheHit?: boolean;
}>;
