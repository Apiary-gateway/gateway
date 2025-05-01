import { z } from 'zod';
export declare const providerModelSchema: z.ZodObject<{
    provider: z.ZodString;
    model: z.ZodString;
}, "strip", z.ZodTypeAny, {
    provider: string;
    model: string;
}, {
    provider: string;
    model: string;
}>;
export declare const weightedProviderModelSchema: z.ZodObject<z.objectUtil.extendShape<{
    provider: z.ZodString;
    model: z.ZodString;
}, {
    weight: z.ZodNumber;
}>, "strip", z.ZodTypeAny, {
    provider: string;
    model: string;
    weight: number;
}, {
    provider: string;
    model: string;
    weight: number;
}>;
export declare const routingConditionSchema: z.ZodObject<{
    name: z.ZodString;
    query: z.ZodAny;
    loadBalance: z.ZodArray<z.ZodObject<z.objectUtil.extendShape<{
        provider: z.ZodString;
        model: z.ZodString;
    }, {
        weight: z.ZodNumber;
    }>, "strip", z.ZodTypeAny, {
        provider: string;
        model: string;
        weight: number;
    }, {
        provider: string;
        model: string;
        weight: number;
    }>, "many">;
    fallbackModel: z.ZodOptional<z.ZodObject<{
        provider: z.ZodString;
        model: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        model: string;
    }, {
        provider: string;
        model: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    loadBalance: {
        provider: string;
        model: string;
        weight: number;
    }[];
    query?: any;
    fallbackModel?: {
        provider: string;
        model: string;
    } | undefined;
}, {
    name: string;
    loadBalance: {
        provider: string;
        model: string;
        weight: number;
    }[];
    query?: any;
    fallbackModel?: {
        provider: string;
        model: string;
    } | undefined;
}>;
export declare const routingSchema: z.ZodObject<{
    defaultModel: z.ZodObject<{
        provider: z.ZodString;
        model: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        model: string;
    }, {
        provider: string;
        model: string;
    }>;
    enableFallbacks: z.ZodBoolean;
    fallbackModel: z.ZodObject<{
        provider: z.ZodString;
        model: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        model: string;
    }, {
        provider: string;
        model: string;
    }>;
    retries: z.ZodNumber;
    availableMetadata: z.ZodArray<z.ZodString, "many">;
    fallbackOnStatus: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    conditions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        query: z.ZodAny;
        loadBalance: z.ZodArray<z.ZodObject<z.objectUtil.extendShape<{
            provider: z.ZodString;
            model: z.ZodString;
        }, {
            weight: z.ZodNumber;
        }>, "strip", z.ZodTypeAny, {
            provider: string;
            model: string;
            weight: number;
        }, {
            provider: string;
            model: string;
            weight: number;
        }>, "many">;
        fallbackModel: z.ZodOptional<z.ZodObject<{
            provider: z.ZodString;
            model: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            provider: string;
            model: string;
        }, {
            provider: string;
            model: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        loadBalance: {
            provider: string;
            model: string;
            weight: number;
        }[];
        query?: any;
        fallbackModel?: {
            provider: string;
            model: string;
        } | undefined;
    }, {
        name: string;
        loadBalance: {
            provider: string;
            model: string;
            weight: number;
        }[];
        query?: any;
        fallbackModel?: {
            provider: string;
            model: string;
        } | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    fallbackModel: {
        provider: string;
        model: string;
    };
    defaultModel: {
        provider: string;
        model: string;
    };
    enableFallbacks: boolean;
    retries: number;
    availableMetadata: string[];
    conditions?: {
        name: string;
        loadBalance: {
            provider: string;
            model: string;
            weight: number;
        }[];
        query?: any;
        fallbackModel?: {
            provider: string;
            model: string;
        } | undefined;
    }[] | undefined;
    fallbackOnStatus?: number[] | undefined;
}, {
    fallbackModel: {
        provider: string;
        model: string;
    };
    defaultModel: {
        provider: string;
        model: string;
    };
    enableFallbacks: boolean;
    retries: number;
    availableMetadata: string[];
    conditions?: {
        name: string;
        loadBalance: {
            provider: string;
            model: string;
            weight: number;
        }[];
        query?: any;
        fallbackModel?: {
            provider: string;
            model: string;
        } | undefined;
    }[] | undefined;
    fallbackOnStatus?: number[] | undefined;
}>;
export declare const guardrailsSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    threshold: z.ZodNumber;
    restrictedWords: z.ZodArray<z.ZodString, "many">;
    sensitivityLevel: z.ZodUnion<[z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>]>;
    resendOnViolation: z.ZodBoolean;
    blockedContentResponse: z.ZodString;
}, "strip", z.ZodTypeAny, {
    threshold: number;
    enabled: boolean;
    restrictedWords: string[];
    sensitivityLevel: 0 | 2 | 1;
    resendOnViolation: boolean;
    blockedContentResponse: string;
}, {
    threshold: number;
    enabled: boolean;
    restrictedWords: string[];
    sensitivityLevel: 0 | 2 | 1;
    resendOnViolation: boolean;
    blockedContentResponse: string;
}>;
export declare const cacheSchema: z.ZodObject<{
    enableSimple: z.ZodBoolean;
    enableSemantic: z.ZodBoolean;
    semanticCacheThreshold: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    enableSimple: boolean;
    enableSemantic: boolean;
    semanticCacheThreshold: number;
}, {
    enableSimple: boolean;
    enableSemantic: boolean;
    semanticCacheThreshold: number;
}>;
export declare const configSchema: z.ZodObject<{
    routing: z.ZodObject<{
        defaultModel: z.ZodObject<{
            provider: z.ZodString;
            model: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            provider: string;
            model: string;
        }, {
            provider: string;
            model: string;
        }>;
        enableFallbacks: z.ZodBoolean;
        fallbackModel: z.ZodObject<{
            provider: z.ZodString;
            model: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            provider: string;
            model: string;
        }, {
            provider: string;
            model: string;
        }>;
        retries: z.ZodNumber;
        availableMetadata: z.ZodArray<z.ZodString, "many">;
        fallbackOnStatus: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        conditions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            query: z.ZodAny;
            loadBalance: z.ZodArray<z.ZodObject<z.objectUtil.extendShape<{
                provider: z.ZodString;
                model: z.ZodString;
            }, {
                weight: z.ZodNumber;
            }>, "strip", z.ZodTypeAny, {
                provider: string;
                model: string;
                weight: number;
            }, {
                provider: string;
                model: string;
                weight: number;
            }>, "many">;
            fallbackModel: z.ZodOptional<z.ZodObject<{
                provider: z.ZodString;
                model: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                provider: string;
                model: string;
            }, {
                provider: string;
                model: string;
            }>>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            loadBalance: {
                provider: string;
                model: string;
                weight: number;
            }[];
            query?: any;
            fallbackModel?: {
                provider: string;
                model: string;
            } | undefined;
        }, {
            name: string;
            loadBalance: {
                provider: string;
                model: string;
                weight: number;
            }[];
            query?: any;
            fallbackModel?: {
                provider: string;
                model: string;
            } | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        fallbackModel: {
            provider: string;
            model: string;
        };
        defaultModel: {
            provider: string;
            model: string;
        };
        enableFallbacks: boolean;
        retries: number;
        availableMetadata: string[];
        conditions?: {
            name: string;
            loadBalance: {
                provider: string;
                model: string;
                weight: number;
            }[];
            query?: any;
            fallbackModel?: {
                provider: string;
                model: string;
            } | undefined;
        }[] | undefined;
        fallbackOnStatus?: number[] | undefined;
    }, {
        fallbackModel: {
            provider: string;
            model: string;
        };
        defaultModel: {
            provider: string;
            model: string;
        };
        enableFallbacks: boolean;
        retries: number;
        availableMetadata: string[];
        conditions?: {
            name: string;
            loadBalance: {
                provider: string;
                model: string;
                weight: number;
            }[];
            query?: any;
            fallbackModel?: {
                provider: string;
                model: string;
            } | undefined;
        }[] | undefined;
        fallbackOnStatus?: number[] | undefined;
    }>;
    guardrails: z.ZodObject<{
        enabled: z.ZodBoolean;
        threshold: z.ZodNumber;
        restrictedWords: z.ZodArray<z.ZodString, "many">;
        sensitivityLevel: z.ZodUnion<[z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>]>;
        resendOnViolation: z.ZodBoolean;
        blockedContentResponse: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        threshold: number;
        enabled: boolean;
        restrictedWords: string[];
        sensitivityLevel: 0 | 2 | 1;
        resendOnViolation: boolean;
        blockedContentResponse: string;
    }, {
        threshold: number;
        enabled: boolean;
        restrictedWords: string[];
        sensitivityLevel: 0 | 2 | 1;
        resendOnViolation: boolean;
        blockedContentResponse: string;
    }>;
    cache: z.ZodObject<{
        enableSimple: z.ZodBoolean;
        enableSemantic: z.ZodBoolean;
        semanticCacheThreshold: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        enableSimple: boolean;
        enableSemantic: boolean;
        semanticCacheThreshold: number;
    }, {
        enableSimple: boolean;
        enableSemantic: boolean;
        semanticCacheThreshold: number;
    }>;
}, "strip", z.ZodTypeAny, {
    guardrails: {
        threshold: number;
        enabled: boolean;
        restrictedWords: string[];
        sensitivityLevel: 0 | 2 | 1;
        resendOnViolation: boolean;
        blockedContentResponse: string;
    };
    cache: {
        enableSimple: boolean;
        enableSemantic: boolean;
        semanticCacheThreshold: number;
    };
    routing: {
        fallbackModel: {
            provider: string;
            model: string;
        };
        defaultModel: {
            provider: string;
            model: string;
        };
        enableFallbacks: boolean;
        retries: number;
        availableMetadata: string[];
        conditions?: {
            name: string;
            loadBalance: {
                provider: string;
                model: string;
                weight: number;
            }[];
            query?: any;
            fallbackModel?: {
                provider: string;
                model: string;
            } | undefined;
        }[] | undefined;
        fallbackOnStatus?: number[] | undefined;
    };
}, {
    guardrails: {
        threshold: number;
        enabled: boolean;
        restrictedWords: string[];
        sensitivityLevel: 0 | 2 | 1;
        resendOnViolation: boolean;
        blockedContentResponse: string;
    };
    cache: {
        enableSimple: boolean;
        enableSemantic: boolean;
        semanticCacheThreshold: number;
    };
    routing: {
        fallbackModel: {
            provider: string;
            model: string;
        };
        defaultModel: {
            provider: string;
            model: string;
        };
        enableFallbacks: boolean;
        retries: number;
        availableMetadata: string[];
        conditions?: {
            name: string;
            loadBalance: {
                provider: string;
                model: string;
                weight: number;
            }[];
            query?: any;
            fallbackModel?: {
                provider: string;
                model: string;
            } | undefined;
        }[] | undefined;
        fallbackOnStatus?: number[] | undefined;
    };
}>;
export declare const presignedUrlSchema: z.ZodObject<{
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    url: string;
}, {
    url: string;
}>;
export type Config = z.infer<typeof configSchema>;
export type PresignedUrl = z.infer<typeof presignedUrlSchema>;
