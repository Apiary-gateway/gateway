import { RoutingLog as RoutingLogType, SupportedLLMs, ModelForProvider } from "./types";
export declare class RoutingLog {
    private log;
    constructor();
    getLog(): RoutingLogType;
    conditionMatched(condition: string): void;
    routedToLoadBalance(): void;
    modelSelected(provider: SupportedLLMs, model: ModelForProvider<SupportedLLMs>): void;
    routedToFallback(newProvider: SupportedLLMs, newModel: ModelForProvider<SupportedLLMs>): void;
    routedToDefault(provider: SupportedLLMs, model: ModelForProvider<SupportedLLMs>): void;
    routedToSpecified(provider: SupportedLLMs, model: ModelForProvider<SupportedLLMs>): void;
    routingError(error: string, statusCode?: number): void;
    cacheHit(cacheType: 'simple' | 'semantic'): void;
    guardrailHit(level: 'one' | 'two', match: string): void;
    guardrailRetry(): void;
    private add;
}
