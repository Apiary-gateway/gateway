import { routingConfig } from './routingConfigData'
import { CallLLMArgs, WeightedProviderModel, ProviderModel, RouteRequestArgs } from './types';
import callLLM from './callLLM';
import { CompletionResponse } from 'token.js';
import { getErrorStatusCode } from './errorHandling';
import { FALLBACK_STATUS_CODES } from './constants';


export async function routeRequest({ history, prompt, provider, model, metadata }: RouteRequestArgs):
Promise<{ text: string, usage: CompletionResponse['usage'] }> {
    const conditions = routingConfig.conditions || [];

    if (provider && model) {
      return await routeToSpecified({ history, prompt, provider, model })
    }

    if (conditions.length > 0 && metadata) {
      for (const cond of conditions) {

        if (cond.query(metadata)) {// fulfills condition, call load balance
          try {
            const selectedModel = weightedPick(cond.loadBalance);
            return await callLLM({ 
              history, 
              prompt, 
              provider: selectedModel.provider, 
              model: selectedModel.model 
            })
  
          } catch (error) {
            // fails, determine status codes to fallback on (configured or detault if not configured)
            const statusCode = getErrorStatusCode(error);
            const fallbackStatuses = routingConfig.fallbackOnStatus || FALLBACK_STATUS_CODES;
            // if status code is a fallback status code, determine fallback model (configured or default if not configured)
            if (statusCode && fallbackStatuses.includes(statusCode)) {

              return routeToFallback({ history, prompt, condition: cond })
            } else {
              throw error;
            }
          }
        } 
      }
    }

    return await routeToDefault({ history, prompt })
}

async function routeToDefault({ history, prompt, condition }: RouteRequestArgs) {
  try {
    const { provider, model } = routingConfig.defaultModel;
    return await callLLM({ history, prompt, provider, model });
  } catch (error) {
    return handleRoutingError(error, history, prompt, condition);
  }
}

async function routeToFallback({ history, prompt, condition }: RouteRequestArgs) {
  const fallbackModel = condition?.fallbackModel || routingConfig.fallbackModel;
  return await callLLM({ 
      history, 
      prompt, 
      provider: fallbackModel.provider, 
      model: fallbackModel.model 
  });
}

async function routeToSpecified({ history, prompt, provider, model }: CallLLMArgs) {
  try {
    return await callLLM({ history, prompt, provider, model });
  } catch (error) {
    return handleRoutingError(error, history, prompt);
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

async function handleRoutingError(
  error: any,
  history: RouteRequestArgs['history'],
  prompt: RouteRequestArgs['prompt'],
  condition?: RouteRequestArgs['condition']
) {
  const statusCode = getErrorStatusCode(error);
  const fallbackStatuses = routingConfig.fallbackOnStatus || FALLBACK_STATUS_CODES;
  if (statusCode && fallbackStatuses.includes(statusCode)) {
    const fallbackModel = condition?.fallbackModel || routingConfig.fallbackModel;
    try {
      return await callLLM({
        history,
        prompt,
        provider: fallbackModel.provider,
        model: fallbackModel.model
      });
    } catch (error) {
      throw error;
    }
  } else {
    throw error;
  }
}
