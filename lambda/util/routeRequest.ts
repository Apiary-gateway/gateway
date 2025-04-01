import { routingConfig } from './routingConfigData'
import { CallLLMArgs, WeightedProviderModel, ProviderModel, RouteRequestArgs } from './types';
import callLLM from './callLLM';
import { CompletionResponse } from 'token.js';
import { getErrorStatusCode } from './errorHandling';
import { FALLBACK_STATUS_CODES } from './constants';
import { MODELS } from './constants';


export async function routeRequest({ history, prompt, provider, model, metadata }: RouteRequestArgs):
Promise<{ text: string, usage: CompletionResponse['usage'] }> {
    const conditions = routingConfig.conditions || [];

    if (provider) {
      model = model || MODELS[provider][0]
      return await routeToSpecified({ history, prompt, provider, model })
    }

    if (conditions.length > 0 && metadata) {
      for (const cond of conditions) {

        if (cond.query(metadata)) { // fulfills condition, call load balance
          try {
            const selectedModel = weightedPick(cond.loadBalance);
            return await callLLM({ 
              history, 
              prompt, 
              provider: selectedModel.provider, 
              model: selectedModel.model 
            })
  
          } catch (error) {
            return await handleRoutingError(error, history, prompt, cond);
          }
        } 
      }
    }

    return await routeToDefault({ history, prompt })
}

async function handleRoutingError(
  error: any,
  history: RouteRequestArgs['history'],
  prompt: RouteRequestArgs['prompt'],
  condition?: RouteRequestArgs['condition']
) {
  const statusCode = getErrorStatusCode(error);
  console.log('statusCode:', statusCode);

  const fallbackStatuses = routingConfig.fallbackOnStatus || FALLBACK_STATUS_CODES;
  if (statusCode && fallbackStatuses.includes(statusCode)) {
    return await routeToFallback({ history, prompt, condition });
  } else {
    console.error('Error routing request:', error)
    throw error;
  }
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

  const result = await callLLM({ 
      history, 
      prompt, 
      provider: fallbackModel.provider, 
      model: fallbackModel.model 
  });

  return result;
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

