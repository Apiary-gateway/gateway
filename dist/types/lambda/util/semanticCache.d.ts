export declare function checkSemanticCache(requestEmbedding: number[], userId?: string, provider?: string, model?: string): Promise<any>;
export declare function addToSemanticCache(embedding: number[], prompt: string, llmResponse: string, userId?: string, provider?: string, model?: string): Promise<void>;
