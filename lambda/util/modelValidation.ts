import { MODELS } from './constants';
import { SupportedLLMs } from './types';

export function isValidModelForProvider(
  provider: string | undefined,
  model: string | undefined
): boolean {
  if (!provider || !model) return false;
  if (!isValidProvider(provider)) {
    return false;
  } else {
    const validModels = MODELS[provider];
    return (validModels as readonly string[]).includes(model);
  }
}

function isValidProvider(provider: string): provider is SupportedLLMs {
    return Object.keys(MODELS).includes(provider as SupportedLLMs);
}
