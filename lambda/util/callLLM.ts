import { SYSTEM_PROMPT } from './constants';
import { TokenJS } from 'token.js';
import { CallLLMArgs } from './types';
import type { CompletionResponse } from 'token.js';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { RoutingLog as RoutingLogType } from './types';
import { SupportedLLMs, ModelForProvider } from './types';
import { addToSimpleCache, checkSimpleCache } from './simpleCache';
import {
  addToSemanticCache,
  checkSemanticCache,
  getEmbedding,
} from './semanticCache';

const SECRET_NAME = 'llm-provider-api-keys';
const CACHE_USAGE_OBJECT = {
  prompt_tokens: 0,
  completion_tokens: 0,
  total_tokens: 0,
};

let cachedApiKeys: Record<string, string> | null = null;

async function loadApiKeys() {
    if (cachedApiKeys) return cachedApiKeys; 
  
    const secretsManager = new SecretsManagerClient();
    const command = new GetSecretValueCommand({ SecretId: SECRET_NAME });
    const response = await secretsManager.send(command);

    if (response && response.SecretString) {
        cachedApiKeys = JSON.parse(response.SecretString);
    }
  
    return;
}

export default async function callLLM({ history, prompt, provider, model, log, userId }: CallLLMArgs):
    Promise<{ 
      text: string, 
      usage: CompletionResponse['usage'], 
      provider: SupportedLLMs, 
      model: ModelForProvider<typeof provider>, 
      log: RoutingLogType,
      simpleCacheHit?: boolean,
      semanticCacheHit?: boolean
    }> {

    try {
      const simpleCacheResponse = await checkSimpleCache(
        prompt,
        userId,
        provider,
        model
      );
      if (simpleCacheResponse) {
        return {
          text: JSON.stringify(simpleCacheResponse) || '',
          usage: CACHE_USAGE_OBJECT,
          provider: provider,
          model: model,
          log: log.getLog(),
          simpleCacheHit: true,
        }
      }; 
      
      const requestEmbedding = await getEmbedding(prompt);
      const semanticCacheResponse =
        await checkSemanticCache(requestEmbedding, userId, provider, model);
      if (semanticCacheResponse) {
        return {
          text: semanticCacheResponse || '',
          usage: CACHE_USAGE_OBJECT,
          provider: provider,
          model: model,
          log: log.getLog(),
          semanticCacheHit: true
        }
      };
      
        await loadApiKeys();

        if (cachedApiKeys) {
            for (const [key, value] of Object.entries(cachedApiKeys)) {
                process.env[key] = value;
            }
        }

        const tokenjs = new TokenJS();

        const response = await tokenjs.chat.completions.create({
            provider: provider,
            model: model,
            messages: [
                { role: 'system', content: process.env.SYSTEM_PROMPT || SYSTEM_PROMPT },
                ...history,
                {
                    role: 'user',
                    content: prompt,
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        const responseText = response.choices?.[0]?.message?.content || '';
        // don't await - no need to wait here
        addToSimpleCache(prompt, responseText, userId, provider, model);
        addToSemanticCache(
          requestEmbedding,
          prompt,
          responseText,
          userId,
          provider,
          model
        );

        return {
            text: responseText,
            usage: response.usage,
            provider: provider,
            model: model,
            log: log.getLog()
        }
    } catch (error) {
        console.error(`Error in ${provider} call:`, error);
        throw error;
    }
}