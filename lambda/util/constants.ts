import { ModelMap } from "./types";

export const SYSTEM_PROMPT = `You are a helpful assistant. You answer in cockney.`;

export const MODELS: {
    [K in keyof ModelMap]: ModelMap[K][];
} = {
    openai: ['gpt-3.5-turbo', 'gpt-4'],
    anthropic: ['claude-3-opus-20240229'],
    gemini: ['gemini-1.5-pro'],
}
