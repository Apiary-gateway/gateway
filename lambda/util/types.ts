import { MODELS } from "./constants";
import { RoutingLog as RoutingLogObject } from "./routingLog";
import type { CompletionResponse } from 'token.js';

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

export type RequestMetadata = Record<string, any>;

type RoutingConditionMatch = {
    field: string,
    operator: string,
    value: string,
}

export type RoutingCondition = {
    name: string;
    match: RoutingConditionMatch;
    loadBalance: WeightedProviderModel[];
    fallbackModel?: ProviderModel;
}

export type RoutingConfig = {
    defaultModel: ProviderModel;
    enableFallbacks: boolean;
    fallbackModel: ProviderModel;
    retries: number;
    availableMetadata: string[];
    fallbackOnStatus?: number[];
    conditions?: RoutingCondition[];
}

export type GuardrailsConfig = {
    enabled: boolean;
    threshold: number;
    restrictedWords: string[];
    sensitivityLevel: 0 | 1 | 2; 
    resendOnViolation: boolean;
    blockedContentResponse: string;
}

export type CacheConfig = {
    enableSimple: boolean;
    simpleCacheTtlSeconds: number;
    enableSemantic: boolean;
    semanticCacheTtlSeconds: number;
    semanticCacheThreshold: number;
}

export type Config = {
    routing: RoutingConfig;
    guardrails: GuardrailsConfig;
    cache: CacheConfig;
    systemPrompt: string;
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
    | { type: 'routing_error'; error: string; statusCode?: number }
    | { type: 'cache_hit'; cacheType: 'simple' | 'semantic' }
    | { type: 'routed_to_guardrails'; level: 'one' | 'two'; topmatch?: number, match?: string }
    | { type: 'guardrail_hit'; level: 'one' | 'two'; match: string }
    | { type: 'guardrail_retry'; };

export type CallLLMArgs = {
    history: InternalMessage[];
    prompt: string;
    provider: SupportedLLMs;
    model: ModelForProvider<SupportedLLMs>;
    log: RoutingLogObject;
    userId?: string;
}

export type CallLLMResponse = {
    text: string, 
    usage: CompletionResponse['usage'], 
    provider: SupportedLLMs, 
    model: ModelForProvider<SupportedLLMs>, 
    log: RoutingLog,
    cost?: number,
    simpleCacheHit?: boolean,
    semanticCacheHit?: boolean
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

export type GuardrailResult = {
    isBlocked: boolean;
    match?: string;
}

export type GuardrailS3Params = {
    bucket: string;
    key: string;
}

interface ModelCost {
    input: number;
    output: number;
    inputSmallPrompt?: number;
    inputLargePrompt?: number;
    outputSmallPrompt?: number;
    outputLargePrompt?: number;
  }
  
  export interface ModelCostType {
    [provider: string]: {
      [model: string]: ModelCost;
    }
  }