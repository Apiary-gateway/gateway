import { SYSTEM_PROMPT } from './constants';
import { TokenJS } from 'token.js';
import { CallLLMArgs, CallLLMResponse } from './types';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { addToSimpleCache, checkSimpleCache } from './simpleCache';
import {
  addToSemanticCache,
  checkSemanticCache,
} from './semanticCache';
import { getEmbedding } from './vectorSearch';
import { checkGuardrails } from './checkGuardrails';
import { config } from './config/config';

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
    Promise<CallLLMResponse> {
    try {
      const simpleCacheResponse = await checkSimpleCache(prompt, userId, provider, model);
      if (simpleCacheResponse) {
        log.cacheHit('simple');
        return {
          text: JSON.stringify(simpleCacheResponse),
          usage: CACHE_USAGE_OBJECT,
          provider,
          model,
          log: log.getLog(),
          simpleCacheHit: true,
        }
      }; 
      
      const requestEmbedding = await getEmbedding(prompt);
      const semanticCacheResponse = await checkSemanticCache(requestEmbedding, userId, provider, model);
      if (semanticCacheResponse) {
        log.cacheHit('semantic');
        return {
          text: semanticCacheResponse,
          usage: CACHE_USAGE_OBJECT,
          provider,
          model,
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
        const systemPrompt = process.env.SYSTEM_PROMPT || SYSTEM_PROMPT;
        const response = await tokenjs.chat.completions.create({
            provider: provider,
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        const responseText = response.choices?.[0]?.message?.content || '';

        const guardrailHit = await checkGuardrails(prompt, responseText, log);
        if (guardrailHit.isBlocked && guardrailHit.match) {
            if (config.guardrails.resendOnViolation) {
                return await callLLMwithGuardrail({ 
                    history, 
                    prompt, 
                    provider, 
                    model, 
                    log, 
                    userId, 
                    llmResponse: responseText, 
                    match: guardrailHit.match, 
                    embeddedPrompt: requestEmbedding });
            } 

            return {
                text: config.guardrails.blockedContentResponse,
                usage: response.usage,
                provider: provider,
                model: model,
                log: log.getLog()
            } 

        }
        // Asynchronously cache results
        addToSimpleCache(prompt, responseText, userId, provider, model);
        addToSemanticCache(requestEmbedding, prompt, responseText, userId, provider, model);

        return {
            text: responseText,
            usage: response.usage,
            provider,
            model,
            log: log.getLog()
        }
    } catch (error) {
        console.error(`Error in ${provider} call:`, error);
        throw error;
    }
}

export async function callLLMwithGuardrail({ history, prompt, provider, model, log, userId, llmResponse, match, embeddedPrompt }: 
    CallLLMArgs & { llmResponse: string, match: string, embeddedPrompt: number[] }):
    Promise<CallLLMResponse> {
    try {

        const tokenjs = new TokenJS();

        log.guardrailRetry();
        const response = await tokenjs.chat.completions.create({
            provider: provider,
            model: model,
            messages: [
                { role: 'system', content: process.env.SYSTEM_PROMPT || SYSTEM_PROMPT },
                ...history,
                {
                    role: 'user',
                    content: prompt,
                },
                {
                    role: 'system',
                    content: llmResponse,
                },
                { 
                    role: 'user',
                    content: `I'd like a response that doesn't include the word or phrase ${match}. 
                    Can you please give me a different answer that doesn't include that sentiment?`
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        const responseText = response.choices?.[0]?.message?.content || '';

        const guardrailHit = await checkGuardrails(prompt, responseText, log);

        if (guardrailHit.isBlocked) {
            return {
                text: config.guardrails.blockedContentResponse,
                usage: response.usage,
                provider: provider,
                model: model,
                log: log.getLog()
            } 
        }
        // don't await - no need to wait here
        addToSimpleCache(prompt, responseText, userId, provider, model);
        addToSemanticCache(
          embeddedPrompt,
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