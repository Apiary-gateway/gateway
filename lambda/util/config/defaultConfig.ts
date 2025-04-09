import { Config } from "../types";

export const defaultConfig: Config = {
  routing: {
    enableFallbacks: true,
    fallbackModel: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' },
    fallbackOnStatus: [500, 503, 429, 401, 403],
    retries: 3,
    availableMetadata: [],
    conditions: [],
    defaultModel: { provider: 'openai', model: 'gpt-3.5-turbo'}
  },
  cache: {
    enableSimple: true,
    enableSemantic: false,
    semanticCacheThreshold: 0.70,
  },
  guardrails: {
    enabled: false,
    threshold: 0.70,
    restrictedWords: [],
    sensitivityLevel: 0,
    resendOnViolation: false, 
    blockedContentResponse: 'Content redacted'
  }
};