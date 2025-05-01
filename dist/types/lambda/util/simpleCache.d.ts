export declare function checkSimpleCache(prompt: string, userId?: string, provider?: string, model?: string): Promise<string | null | undefined>;
export declare function addToSimpleCache(prompt: string, llmResponse: string, userId?: string, provider?: string, model?: string): Promise<void>;
