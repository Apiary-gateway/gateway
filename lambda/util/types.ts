import { MODELS } from "./constants";

export type InternalMessage = {
    threadID?: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp?: number;
}

export type SupportedLLMs = keyof typeof MODELS;
export type ModelForProvider<T extends SupportedLLMs> = typeof MODELS[T][number];
export type AllModels = typeof MODELS[SupportedLLMs][number];

// export type ModelMap = {
//     [K in keyof typeof MODELS]: (typeof MODELS)[K][number]
// }
// K is of type provider in the MODELS constant, 
// the value is the corresponding value for the provider (the models) and then the union of those (the [number] part)

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
    query: (meta: RequestMetadata) => boolean;
    loadBalance: WeightedProviderModel[];
    fallbackModel?: ProviderModel;
}

export type RoutingConfig = {
    conditions?: RoutingCondition[];
    defaultModel: ProviderModel;
    fallbackModel: ProviderModel;
    fallbackOnAnyError: boolean;
    fallbackOnStatus?: number[];
}

export type CallLLMArgs = {
    history: InternalMessage[];
    prompt: string;
    provider: ProviderModel['provider'];
    model: string;
}

export type CallLLM = (args: CallLLMArgs) => Promise<any>;

export type RouteRequestArgs = {
    history: InternalMessage[];
    prompt: string;
    provider?: SupportedLLMs;
    model?: string;
    metadata?: RequestMetadata;
    condition?: RoutingCondition;
}

export type ParsedRequestData = {
    threadID: string;
    prompt: string;
    provider?: SupportedLLMs;
    model?: string;
}
