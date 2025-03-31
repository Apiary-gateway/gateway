import { RoutingConfig } from './types';

export const routingConfig: RoutingConfig = {
  fallbackModel: { provider: 'anthropic', model: 'claude-3-haiku' },
  fallbackOnAnyError: true,
  fallbackOnStatus: [500, 429],
  conditions: [
    {
      query: (meta) => meta.userType === 'pro',
      loadBalance: [
        { provider: 'openai', model: 'gpt-4', weight: 0.7 },
        { provider: 'anthropic', model: 'claude-3-opus-20240229', weight: 0.3 },
      ],
      fallbackModel: { provider: 'openai', model: 'gpt-3.5-turbo' }
    },
    {
      query: (meta) => meta.region === 'eu',
      loadBalance: [
        { provider: 'openai', model: 'gpt-4o-mini', weight: 1 },
      ],
    },
  ],
  defaultModel: { provider: 'openai', model: 'gpt-3.5-turbo'}
};