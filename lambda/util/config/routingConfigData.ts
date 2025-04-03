import { RoutingConfig } from '../types';

export const routingConfig: RoutingConfig = {
  fallbackModel: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' },
  fallbackOnStatus: [500, 503, 429, 401, 403],
  conditions: [
    {
      name: 'pro-users',
      query: (meta) => meta.userType === 'pro',
      loadBalance: [
        { provider: 'openai', model: 'gpt-4', weight: 0.7 },
        { provider: 'anthropic', model: 'claude-3-opus-20240229', weight: 0.3 },
      ],
      fallbackModel: { provider: 'openai', model: 'gpt-3.5-turbo' }
    },
    {
      name: 'eu-users',
      query: (meta) => meta.region === 'eu',
      loadBalance: [
        { provider: 'gemini', model: 'gemini-2.0-flash-001', weight: 1 },
      ],
    },
  ],
  defaultModel: { provider: 'openai', model: 'gpt-3.5-turbo'}
};