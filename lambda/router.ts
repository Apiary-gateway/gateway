import { validateRequest } from './util/validateRequest';
import {
  extractRequestData,
  extractRequestMetadata,
} from './util/extractRequestData';
import { getMessageHistory, saveMessages } from './util/getAndSaveMessages';
import { routeRequest } from './util/routeRequest';
import { Logger } from './util/logger';
import { initConfig } from './util/getConfig';

export const handler = async (event: unknown) => {
    await initConfig();
    const logger = new Logger();
    logger.setRawRequest(JSON.stringify(event, null, 2));
    
    try {
      const payload = validateRequest(event);
      const { threadID, prompt, provider, model, userId } =
        extractRequestData(payload);
      const metadata = extractRequestMetadata(event, payload);

      logger.setInitialData(threadID, userId, JSON.stringify(metadata));

      const history = await getMessageHistory(threadID);
      const response = await routeRequest({
        history,
        prompt,
        provider,
        model,
        metadata,
      });

      saveMessages(prompt, response.text, threadID);

      let successReason;

      if (response.simpleCacheHit) {
        successReason = 'SIMPLE_CACHE_HIT';
      } else if (response.semanticCacheHit) {
        successReason = 'SEMANTIC_CACHE_HIT';
      } else {
        successReason = 'LLM_RESPONSE';
      }

      logger.logSuccessData(
        response.model,
        response.provider,
        response.log,
        successReason,
        JSON.stringify(response, null, 2),
        response.cost
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown Error';

      await logger.logErrorData('Unknown Error Reason', errorMessage);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: errorMessage,
        }),
      };
    }
};