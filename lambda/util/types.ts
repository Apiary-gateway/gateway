export type InternalMessage = {
    threadID?: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp?: number;
}

export type SupportedLLMs = 'openai' | 'anthropic';

export type ModelMap = {
    openai: 'gpt-3.5-turbo' | 'gpt-4';
    anthropic: 'claude-3-opus-20240229';
}

export const MODELS: {
    [K in keyof ModelMap]: ModelMap[K][];
} = {
    openai: ['gpt-3.5-turbo', 'gpt-4'],
    anthropic: ['claude-3-opus-20240229'],
}
