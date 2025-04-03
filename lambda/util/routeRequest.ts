import { routingConfig } from './routingConfigData'
import { CallLLMArgs, WeightedProviderModel, ProviderModel, RouteRequestArgs } from './types';
import callLLM from './callLLM';
import { CompletionResponse } from 'token.js';
import { getErrorStatusCode } from './errorHandling';
import { FALLBACK_STATUS_CODES } from './constants';
import { MODELS } from './constants';
import { RoutingLog } from './routingLog';
import { SupportedLLMs, ModelForProvider } from './types';
import { RoutingLog as RoutingLogType } from './types';

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
    const conditions = routingConfig.conditions || [];

    if (provider) {
      model = model || MODELS[provider][0];
      return await routeToSpecified({ history, prompt, provider, model, log })
    }

    if (conditions.length > 0 && metadata) {
      for (const cond of conditions) {

        if (cond.query(metadata)) { // fulfills condition, call load balance
          try {
            log.conditionMatched(cond.name)
            log.routedToLoadBalance();
            const selectedModel = weightedPick(cond.loadBalance);
            log.modelSelected(selectedModel.provider, selectedModel.model)
            return await callLLM({ 
              history, 
              prompt, 
              provider: selectedModel.provider, 
              model: selectedModel.model,
              log,
              userId
            })
  
          } catch (error) {
            return await handleRoutingError(error, history, prompt, log, cond);
          }
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
  const statusCode = getErrorStatusCode(error);
  log.routingError(error.message, statusCode);

  const fallbackStatuses = routingConfig.fallbackOnStatus || FALLBACK_STATUS_CODES;
  if (statusCode && fallbackStatuses.includes(statusCode)) {
    return await routeToFallback({ history, prompt, condition, log });
  } else {
    console.error('Error routing request:', error)
    throw error;
  }
}

async function routeToDefault({ history, prompt, condition, log, userId }: RouteRequestArgs) {
  try {
    const { provider, model } = routingConfig.defaultModel;
    log.routedToDefault(provider, model);
    return await callLLM({ history, prompt, provider, model, log, userId });
  } catch (error) {
    return handleRoutingError(error, history, prompt, log, condition);
  }
}

async function routeToFallback({ history, prompt, condition, log, userId }: RouteRequestArgs) {
  const fallbackModel = condition?.fallbackModel || routingConfig.fallbackModel;
  log.routedToFallback(fallbackModel.provider, fallbackModel.model);
  const result = await callLLM({ 
      history, 
      prompt, 
      provider: fallbackModel.provider, 
      model: fallbackModel.model,
      log,
      userId
  });

  return result;
}

async function routeToSpecified({ history, prompt, provider, model, log, userId }: CallLLMArgs) {
  try {
    log.routedToSpecified(provider, model);
    return await callLLM({ history, prompt, provider, model, log, userId });
  } catch (error) {
    return handleRoutingError(error, history, prompt, log);
  }
}

function weightedPick(choices: WeightedProviderModel[]): ProviderModel {
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

