// all of this is just to test OpenSearch access from Lambda
// import {
//   OpenSearchServerlessClient,
//   ListCollectionsCommand
// } from '@aws-sdk/client-opensearchserverless';

// const client = new OpenSearchServerlessClient({ region: process.env.AWS_REGION });

// export const handler = async () => {
//   try {
//     const result = await client.send(new ListCollectionsCommand({}));
//     console.log('OpenSearch collections:', JSON.stringify(result, null, 2));
//     return {
//       statusCode: 200,
//       body: JSON.stringify(result),
//     };
//   } catch (err: any) {
//     console.error('Error describing OpenSearch collections:', err);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ message: err.message || err }),
//     };
//   }
// };

import { z } from 'zod';
import callLLM from './util/callLLM';
import { saveMessage, getMessageHistory } from './util/getAndSaveMessages';
import {
  logSuccessfulRequest,
  logFailedRequest,
  CommonLogData,
  VALID_MODELS,
  VALID_PROVIDERS,
} from './util/logger';
import { addToSimpleCache, checkSimpleCache } from './util/simpleCache';
import { addToSemanticCache, checkSemanticCache, getEmbedding } from './util/semanticCache';
import { parse } from 'path';

const RequestSchema = z.object({
  prompt: z.string().min(1),
  threadID: z.string().optional(),
  provider: z.enum(['openai', 'anthropic', 'gemini']).optional(),
  model: z
    .enum([
      'gpt-3.5-turbo',
      'gpt-4',
      'claude-3-opus-20240229',
      'gemini-1.5-pro',
    ])
    .optional(),
  userId: z.string().min(1).optional(),
});

export type RequestPayload = z.infer<typeof RequestSchema>;

export const handler = async (event: any) => {
  const logData: CommonLogData = {
    requestStartTime: Date.now(),
    provider: null,
    model: null,
    tokens_used: 0,
    cost: 0,
    RawRequest: JSON.stringify(event),
  };

  try {
    const body =
      typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      await logFailedRequest({
        ...logData,
        errorMessage: 'Invalid Request Body',
      });

      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid request body.',
          details: parsed.error.flatten(),
        }),
      };
    }

    const { prompt } = parsed.data;
    // const threadID = parsed.data.threadID || Date.now().toString();
    let { provider, model } = parsed.data;
    // const history = await getMessageHistory(threadID);

    // Type assertion because from parsed.data `provider` and `model` should comeout as `VALID_MODELS` and `VALID_PROVIDERS`

    logData.model = model as VALID_MODELS;
    logData.provider = provider as VALID_PROVIDERS;

    if (!prompt) {
      await logFailedRequest({
        ...logData,
        errorMessage: 'No prompt provided in the request body',
      });

      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'No prompt provided in the request body.',
        }),
      };
    }

    // await saveMessage({
    //   threadID: threadID,
    //   role: 'user',
    //   content: prompt,
    // });

    // check for response in simple cache
    // Mar 29 - this version will not include provider in response if provider not specified
    const simpleCacheResponse = await checkSimpleCache(parsed.data);
    if (simpleCacheResponse) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          provider,
          simpleCacheResponse,
        }),
      };
    }

    if (!provider) {
      provider = Math.random() < 0.5 ? 'openai' : 'anthropic';
    }

    // const requestEmbedding = [1, 2, 3];
    const requestEmbedding = await getEmbedding(prompt);
    const semanticCacheResponse = await checkSemanticCache(parsed.data, requestEmbedding);
    console.log('semantic cache response:', JSON.stringify(semanticCacheResponse));

    // const index = await signedGet('/semantic-cache-index');
    // console.log('test from router:', JSON.stringify(index));
    

    const response = await callLLM([], prompt, provider, model);

    // await saveMessage({
    //   threadID: threadID,
    //   role: 'assistant',
    //   content: response.text,
    // });

    await logSuccessfulRequest({
      ...logData,
      RawResponse: JSON.stringify(response),
    });

    // don't await - no need to wait here
    addToSimpleCache(parsed.data, response);
    await addToSemanticCache(parsed.data, requestEmbedding, response);

    return {
      statusCode: 200,
      body: JSON.stringify({
        provider,
        response,
        semanticCacheResponse
      }),
    };
  } catch (error) {
    console.error(error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown Error';

    await logFailedRequest({ ...logData, errorMessage });

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: errorMessage,
      }),
    };
  }
};
