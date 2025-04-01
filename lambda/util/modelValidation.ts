import { MODELS } from './constants';
import { SupportedLLMs, AllModels } from './types';

export function isValidModelForProvider(
  provider: string | undefined,
  model: string | undefined
): boolean {
  if (!provider || !model) return false;
  if (!(provider in MODELS)) return false;

  const validModels = MODELS[provider as SupportedLLMs];
  return (validModels as readonly string[]).includes(model);
}

export function validateModel({ provider, model }: { provider?: string, model?: string }): boolean {
    return isValidModelForProvider(provider, model);
}
