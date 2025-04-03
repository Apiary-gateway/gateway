import { validateRequest } from './util/validateRequest';
import {
  extractRequestData,
  extractRequestMetadata,
} from './util/extractRequestData';
import { getMessageHistory, saveMessages } from './util/getAndSaveMessages';
import { routeRequest } from './util/routeRequest';
import { validateModel } from './util/modelValidation';
import { SupportedLLMs, AllModels } from './util/types';
import //   logSuccessfulRequest,
//   logFailedRequest,
//   CommonLogData,
'./util/logger';
import { addToSimpleCache, checkSimpleCache } from './util/simpleCache';
import {
  addToSemanticCache,
  checkSemanticCache,
  getEmbedding,
} from './util/semanticCache';
import { parse } from 'path';
import { Logger } from './util/logger';

export const handler = async (event: unknown) => {
  const logger = new Logger();
  try {
    const parsedRequest = validateRequest(event);

    if (!parsedRequest.success) {
      // Do we save the response body as well.
      // Need to add status code 400 to the logger.
      logger.logError('Invalid Request Body');
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid request body.',
          details: parsedRequest.error,
        }),
      };
    }

    const payload = parsedRequest.data;
    const { threadID, prompt, provider, model, userId } =
      extractRequestData(payload);
    const metadata = extractRequestMetadata(event, payload);

    if (!prompt) {
      // await logFailedRequest({
      //   ...logData,
      //   errorMessage: 'No prompt provided in the request body',
      // });

      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'No prompt provided in the request body.',
        }),
      };
    }

    if (provider && model && !validateModel({ provider, model })) {
      // await logFailedRequest({
      //   ...logData,
      //   errorMessage: 'Provider and model combination invalid.',
      // });

      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Provider and model combination invalid. ',
        }),
      };
    }

    // TODO: ALL VALIDATION DONE ( all validation logic should move to the validation file)
    // Now we need to add the data to the logger.
    // At this point we have extracted the data from the request body, and the metadata - and now add everything except provider and model
    // Provider and model for purposes of logging represent the actual model from which the response will be generated and hence should be added at the end.

    // TODO
    // If cache is hit, we need to save the log into the database.
    // What is the response being send? How do we save it? Are we sending something in the header?
    const simpleCacheResponse = await checkSimpleCache(
      prompt,
      userId,
      provider,
      model
    );
    if (simpleCacheResponse) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          provider,
          simpleCacheResponse,
        }),
      };
    }

    // Same questions here.

    const requestEmbedding = await getEmbedding(prompt);
    const semanticCacheResponse =
      await checkSemanticCache(requestEmbedding, userId, provider, model);
    if (semanticCacheResponse) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          provider,
          semanticCacheResponse,
        }),
    };
    }

    const history = await getMessageHistory(threadID);
    const response = await routeRequest({
      history,
      prompt,
      provider,
      model,
      metadata,
    });

    await saveMessages(prompt, response.text, threadID);

    // await logSuccessfulRequest({
    //   ...logData,
    //   RawResponse: JSON.stringify(response),
    // });

    // don't await - no need to wait here
    addToSimpleCache(prompt, response.text, userId, provider, model);
    addToSemanticCache(
      requestEmbedding,
      prompt,
      response.text,
      userId,
      provider,
      model
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        threadID,
        response,
      }),
    };
  } catch (error) {
    console.error(error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown Error';

    // await logFailedRequest({ ...logData, errorMessage });

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: errorMessage,
      }),
    };
  }
};
