import { MODELS } from "./constants";
import { RoutingLog as RoutingLogObject } from "./routingLog";

export type InternalMessage = {
    threadID?: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp?: number;
}

export type SupportedLLMs = keyof typeof MODELS;
export type ModelForProvider<T extends SupportedLLMs> = typeof MODELS[T][number];
export type AllModels = typeof MODELS[SupportedLLMs][number];

export type ProviderModel = {
    [K in SupportedLLMs]: { provider: K, model: ModelForProvider<K> }
}[SupportedLLMs];
// typing an object where K is one of the providers, the value is an object where provider is that provider,
// model is the union of the corresponding models for that provider
// then [SupportedLLMs] indicates that it's just one of those object entries (type is the union of them)

export type WeightedProviderModel = ProviderModel & { weight: number };

export type RequestMetadata = {
    userType?: string;
    region?: string;
};

export type RoutingCondition = {
    name: string;
    query: (meta: RequestMetadata) => boolean;
    loadBalance: WeightedProviderModel[];
    fallbackModel?: ProviderModel;
}

export type RoutingConfig = {
    conditions?: RoutingCondition[];
    defaultModel: ProviderModel;
    fallbackModel: ProviderModel;
    fallbackOnStatus?: number[];
}

export type CallLLMArgs = {
    history: InternalMessage[];
    prompt: string;
    provider: SupportedLLMs;
    model: ModelForProvider<SupportedLLMs>;
    log: RoutingLogObject;
    userId?: string;
}

export type RouteRequestArgs = {
    history: InternalMessage[];
    prompt: string;
    log: RoutingLogObject;
    provider?: SupportedLLMs;
    model?: ModelForProvider<SupportedLLMs>;
    metadata?: RequestMetadata;
    condition?: RoutingCondition;
    userId?: string;
}

export type ParsedRequestData = {
    threadID: string;
    prompt: string;
    provider?: SupportedLLMs;
    model?: ModelForProvider<SupportedLLMs>;
    userId?: string;
}

export interface RoutingLog {
    timestamp: string;
    events: RoutingEvent[];
}

export type RoutingEvent = 
    | { type: 'condition_match'; condition: string }
    | { type: 'routed_to_load_balance' }
    | { type: 'model_selected'; provider: SupportedLLMs; model: string }
    | { type: 'routed_to_fallback'; newProvider: string; newModel: string }
    | { type: 'routed_to_default'; provider: string; model: string }
    | { type: 'routed_to_specified'; provider: string; model: string }
    | { type: 'routing_error'; error: string; statusCode?: number };