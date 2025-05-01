export declare const SYSTEM_PROMPT = "You are a helpful assistant. You answer in cockney.";
export declare const MODELS: {
    readonly openai: readonly ["gpt-3.5-turbo", "gpt-4", "gpt-4o-mini"];
    readonly anthropic: readonly ["claude-3-opus-20240229", "claude-3-5-haiku-20241022"];
    readonly gemini: readonly ["gemini-1.5-pro", "gemini-2.0-flash-001"];
};
export declare const providerNames: readonly ["openai", "anthropic", "gemini"];
export declare const modelNames: readonly ["gpt-3.5-turbo", "gpt-4", "gpt-4o-mini", "claude-3-opus-20240229", "claude-3-5-haiku-20241022", "gemini-1.5-pro", "gemini-2.0-flash-001"];
export declare const FALLBACK_STATUS_CODES: number[];
