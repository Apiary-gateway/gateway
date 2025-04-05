import { validateRequest } from './util/validateRequest';
import {
  extractRequestData,
  extractRequestMetadata,
} from './util/extractRequestData';
import { getMessageHistory, saveMessages } from './util/getAndSaveMessages';
import { routeRequest } from './util/routeRequest';
import { isValidModelForProvider } from './util/modelValidation';
// import { parse } from 'path';
// import { calculateCost } from "./util/calculateCost";

export const handler = async (event: unknown) => {
  try {
    const payload = validateRequest(event);
    const { threadID, prompt, provider, model, userId } =
      extractRequestData(payload);
    const metadata = extractRequestMetadata(event, payload);

    const history = await getMessageHistory(threadID);
    const response = await routeRequest({
      history,
      prompt,
      provider,
      model,
      metadata,
    });

    await saveMessages(prompt, response.text, threadID);

    console.log(
      userId,
      threadID,
      response.text,
      response.provider,
      response.model,
      response.log,
      response.usage?.completion_tokens,
      response.usage?.prompt_tokens
      // response.simpleCacheHit,
      // response.semanticCacheHit
    );

    return {
      statusCode: 200,
      headers: {
        'simple-cache': `${response.simpleCacheHit ? 'HIT' : 'MISS'}`,
        'semantic-cache': `${response.semanticCacheHit ? 'HIT' : 'MISS'}`,
      },
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
