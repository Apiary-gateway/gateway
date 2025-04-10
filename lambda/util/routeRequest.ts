import { CallLLMArgs, 
         WeightedProviderModel, 
         ProviderModel, 
         RouteRequestArgs, 
         SupportedLLMs, 
         ModelForProvider, 
         RoutingLog as RoutingLogType,
         RoutingCondition } from './types';
import callLLM from './callLLM';
import { CompletionResponse } from 'token.js';
import { getErrorStatusCode } from './errorHandling';
import { FALLBACK_STATUS_CODES } from './constants';
import { MODELS } from './constants';
import { RoutingLog } from './routingLog';
import { retryWithBackoff } from './retryWithBackoff';
import { getConfig } from './getConfig'

export async function routeRequest({ history, prompt, provider, model, metadata, userId }: Omit <RouteRequestArgs, 'log'>):
Promise<{       
  text: string, 
  usage: CompletionResponse['usage'], 
  provider: SupportedLLMs, 
  model: ModelForProvider<SupportedLLMs>, 
  log: RoutingLogType,
  simpleCacheHit?: boolean,
  semanticCacheHit?: boolean 
}> {

    const log = new RoutingLog();
    const config = getConfig();
    const conditions = config.routing.conditions || [];

    if (provider) {
      model = model || MODELS[provider][0];
      return await routeToSpecified({ history, prompt, provider, model, log })
    }

    if (conditions.length > 0 && metadata) {
      const matchedCondition = config.routing.conditions?.find(condition => evaluateCondition(condition, metadata))
      if (matchedCondition) {
        log.conditionMatched(matchedCondition.name)
        log.routedToLoadBalance();
        const { provider, model } = weightedPick(matchedCondition.loadBalance);
        log.modelSelected(provider, model)
        try {
          return await retryWithBackoff(() => callLLM({ history, prompt, provider, model, log, userId }));
        } catch (error) {
          return await handleRoutingError(error, history, prompt, log, matchedCondition);
        }
      }
    } 

    return await routeToDefault({ history, prompt, log })
}

async function handleRoutingError(
    error: any,
    history: RouteRequestArgs['history'],
    prompt: RouteRequestArgs['prompt'],
    log: RoutingLog,
    condition?: RouteRequestArgs['condition'],
) {
    const config = getConfig();
    const statusCode = getErrorStatusCode(error);
    log.routingError(error.message, statusCode);

    const fallbackStatuses = config.routing.fallbackOnStatus || FALLBACK_STATUS_CODES;
    if (statusCode && config.routing.enableFallbacks && fallbackStatuses.includes(statusCode)) {
      return await routeToFallback({ history, prompt, condition, log });
    } else {
      console.error('Error routing request:', error)
      throw error;
    }
}

async function routeToDefault({ history, prompt, condition, log, userId }: RouteRequestArgs) {
    try {
      const config = getConfig();
      const { provider, model } = config.routing.defaultModel;
      log.routedToDefault(provider, model);
      return await retryWithBackoff(() => callLLM({ history, prompt, provider, model, log, userId }));
    } catch (error) {
      return handleRoutingError(error, history, prompt, log, condition);
    }
}

async function routeToFallback({ history, prompt, condition, log, userId }: RouteRequestArgs) {
    const config = getConfig();
    const { provider, model } = condition?.fallbackModel || config.routing.fallbackModel;
    log.routedToFallback(provider, model);
    return await retryWithBackoff(() => callLLM({ history, prompt, provider, model, log, userId}));
}

async function routeToSpecified({ history, prompt, provider, model, log, userId }: CallLLMArgs) {
    try {
      log.routedToSpecified(provider, model);
      return await retryWithBackoff(() => callLLM({ history, prompt, provider, model, log, userId }));
    } catch (error) {
      return handleRoutingError(error, history, prompt, log);
    }
}

function weightedPick(choices: WeightedProviderModel[]): ProviderModel {
    const config = getConfig();
    if (!choices) {
      return config.routing.defaultModel;
    }
    
    if (!choices.length) {
      throw new Error('No choices provided for weighted selection');
    }

    const totalWeight = choices.reduce((acc, choice) => acc + choice.weight, 0);
    const randomWeight = Math.random() * totalWeight;

    let currentWeight = 0;
    for (const choice of choices) {
      currentWeight += choice.weight;
      if (randomWeight < currentWeight) {
        return choice;
      }
    }

    return choices[choices.length - 1];
}

function evaluateCondition(condition: RoutingCondition, metadata: Record<string, string>): boolean {
  const { field, operator, value } = condition.match;
  const actual = metadata[field];
  console.log('actual: ', actual, 'value: ', value);

  switch (operator) {
    case 'equals':
      return actual === value;
    case 'notEquals':
      return actual !== value;
    case 'in':
      return Array.isArray(value) && value.includes(actual);
    case 'contains':
      return actual?.includes(value.toString());
    case 'lessThan':
      return Number(actual) < Number(value);
    case 'greaterThan':
      return Number(actual) > Number(value);
    default:
      return false;
  }
}