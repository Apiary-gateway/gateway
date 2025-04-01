export const SYSTEM_PROMPT = `You are a helpful assistant. You answer in cockney.`;

export const MODELS = {
    openai: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o-mini'] as const,
    anthropic: ['claude-3-opus-20240229', 'claude-3-5-haiku-20241022'] as const,
    gemini: ['gemini-1.5-pro', 'gemini-2.0-flash-001'] as const,
} as const;

export const FALLBACK_STATUS_CODES: number[] = [500, 429, 503, 401, 403];

// status codes
// 401 is Authentication (missing API key)
// 429 is rate limiting
