import { validateRequest } from "./util/validateRequest";
import { extractRequestData, extractRequestMetadata } from "./util/extractRequestData";
import { getMessageHistory, saveMessages } from "./util/getAndSaveMessages";
import { routeRequest } from "./util/routeRequest";
import { isValidModelForProvider } from "./util/modelValidation";
// import {
//     logSuccessfulRequest,
//     logFailedRequest,
//     CommonLogData,
// } from './util/logger';
import { parse } from 'path';

export const handler = async (event: unknown) => {
    // const logData: CommonLogData = {
    //     requestStartTime: Date.now(),
    //     provider: null,
    //     model: null,
    //     tokens_used: 0,
    //     cost: 0,
    //     RawRequest: JSON.stringify(event),
    // };

    try {
      const payload = validateRequest(event);
      const { threadID, prompt, provider, model, userId } = extractRequestData(payload);
      const metadata = extractRequestMetadata(event, payload);

        const history = await getMessageHistory(threadID);
        const response = await routeRequest({ history, prompt, provider, model, metadata });
        
        await saveMessages(prompt, response.text, threadID); 

        // await logSuccessfulRequest({
        //     ...logData,
        //     RawResponse: JSON.stringify(response),
        // });
        console.log(
            userId,
            threadID,
            response.text, 
            response.provider, 
            response.model, 
            response.log, 
            response.usage?.completion_tokens, 
            response.usage?.prompt_tokens,
        )

        return {
            statusCode: 200,
            headers: {
              "simple-cache": `${response.simpleCacheHit ? 'HIT' : 'MISS'}`,
              "semantic-cache": `${response.semanticCacheHit ? 'HIT' : 'MISS'}`,
            },
            body: JSON.stringify({
                threadID,
                response
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
        }
    }
}