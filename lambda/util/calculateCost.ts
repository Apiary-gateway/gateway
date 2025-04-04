import { AllModels, ModelCostType, SupportedLLMs } from "./types";

// prices are in dollars per million tokens
const modelCosts: ModelCostType = {
  anthropic: {
    'claude-3-5-haiku-20241022': {
    input: 0.8,
    output: 4,
    },
    'claude-3-opus-20240229': {
      input: 15,
      output: 75,
    },
  },
  gemini: {
    'gemini-1.5-pro': {
      input: 1.25, // for prompts <=128K tokens
      inputLargePrompt: 2.50, // for prompts >128K tokens
      output: 5, // for prompts <=128K tokens
      outputLargePrompt: 10, // for prompts >128K tokens
    },
    'gemini-2.0-flash-001': {
      input: 0.1,
      output: 0.4,
    }
  },
  openai: {
    'gpt-3.5-turbo': {
      input: 0.5,
      output: 1.5,
    },
    'gpt-4': {
      input: 30,
      output: 60,
    },
    'gpt-4o-mini': {
      input: 0.15,
      output: 0.6,
    },
  },
};

export function calculateCost(
  provider: SupportedLLMs, 
  model: AllModels, 
  inputTokens: number, 
  outputTokens: number
) {
  let inputCostPerToken, outputCostPerToken;
  
  if (
    provider === 'gemini' 
    && model === 'gemini-1.5-pro' 
    && inputTokens > 128000
    && modelCosts[provider][model].inputLargePrompt
    && modelCosts[provider][model].outputLargePrompt
  ) {
    inputCostPerToken = modelCosts[provider][model].inputLargePrompt / 1000000;
    outputCostPerToken = modelCosts[provider][model].outputLargePrompt / 1000000;
  } else {
    inputCostPerToken = modelCosts[provider][model].input / 1000000;
    outputCostPerToken = modelCosts[provider][model].output / 1000000;
  }

  const inputCost = inputTokens * inputCostPerToken;
  const outputCost = outputTokens * outputCostPerToken;

  return inputCost + outputCost;
}
