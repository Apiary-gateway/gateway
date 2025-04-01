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

import { validateRequest } from "./util/validateRequest";
import { extractRequestData, extractRequestMetadata } from "./util/extractRequestData";
import { getMessageHistory, saveMessages } from "./util/getAndSaveMessages";
import { routeRequest } from "./util/routeRequest";
import { validateModel } from "./util/modelValidation";
import { SupportedLLMs, AllModels } from "./util/types";
import {
    logSuccessfulRequest,
    logFailedRequest,
    CommonLogData,
} from './util/logger';
import { addToSimpleCache, checkSimpleCache } from './util/simpleCache';
import { addToSemanticCache, checkSemanticCache, getEmbedding } from './util/semanticCache';
import { parse } from 'path';

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
        const parsed = validateRequest(event);
        if (!parsed.success) {
            await logFailedRequest({
                ...logData,
                errorMessage: 'Invalid Request Body',
            });

            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "Invalid request body.",
                    details: parsed.error.flatten(),
                }),
            }
        } 

        const payload = parsed.data;
        const { threadID, prompt, provider, model } = extractRequestData(payload);
        const metadata = extractRequestMetadata(event, payload);
        
        logData.model = model as AllModels;
        logData.provider = provider as SupportedLLMs;

        if (!prompt) {
            await logFailedRequest({
                ...logData,
                errorMessage: 'No prompt provided in the request body',
            });

            return {
                statusCode: 400,
                body: JSON.stringify({ message: "No prompt provided in the request body." }),
            };
        }

        if (provider && model && !validateModel({ provider, model })) {
            await logFailedRequest({
                ...logData,
                errorMessage: 'Provider and model combination invalid.',
            });

            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Provider and model combination invalid. '})
            }
        }

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

        const history = await getMessageHistory(threadID);
        const response = await routeRequest({ history, prompt, provider, model, metadata });
        
        await saveMessages(prompt, response.text, threadID); 

        await logSuccessfulRequest({
            ...logData,
            RawResponse: JSON.stringify(response),
        });

        // don't await - no need to wait here
        addToSimpleCache(parsed.data, response);
    addToSemanticCache(parsed.data, requestEmbedding, response);

        return {
            statusCode: 200,
            body: JSON.stringify({
                threadID,
                response
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
        }
    }
}






