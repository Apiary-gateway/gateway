import { 
  DynamoDBClient, 
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import type { CompletionResponse } from 'token.js';
import { RequestPayload } from '../router';

// TODOS
// include cache hit or miss header in response from `router`
// format cached response better
// add to README - optional `userId` field in request body for cache partitioning
// add configuration to `router` function to conditionally check just simple cache or both simple & semantic

const dynamoClient = new DynamoDBClient();
const CACHE_TABLE_NAME = process.env.CACHE_TABLE_NAME || '';
const CACHE_TTL_SECONDS = 60 * 5; // 5 minutes

export async function checkSimpleCache(body: RequestPayload) {
  const [ userId, cacheKey ] = getCacheKeys(body);

  const input = {
    TableName: CACHE_TABLE_NAME,
    Key: { 
      userId: {
        S: userId
      }, 
      cacheKey: {
        S: cacheKey
      } 
    },
    // only send back `llmResponse` field?
    // ProjectionExpression: 'llmResponse',
  };
  
  const command = new GetItemCommand(input);
  const result = await dynamoClient.send(command);
  console.log('fetched from Dynamo: ', result.Item ? result.Item.llmResponse : 'no cache hit');
  return result.Item ? result.Item.llmResponse : null;
}

// Function to store result in cache
export async function addToSimpleCache(
  body: RequestPayload, 
  llmResponse: { text: string, usage: CompletionResponse['usage'] }
) {
  const [ userId, cacheKey ] = getCacheKeys(body);
  const ttl = Math.floor(Date.now() / 1000) + CACHE_TTL_SECONDS;

  const input = {
    TableName: CACHE_TABLE_NAME,
    Item: { 
      userId: {
        S: userId
      }, 
      cacheKey: {
        S: cacheKey
      }, 
      llmResponse: {
        S: JSON.stringify(llmResponse)
      }, 
      ttl: {
        N: String(ttl)
      }
    },
  };
  
  const command = new PutItemCommand(input);
  await dynamoClient.send(command);
}

function getCacheKeys(requestBody: RequestPayload): string[] {
  const { userId, provider, model, prompt } = requestBody;
  const parsedUserId = userId || 'global';
  const cacheKey = `${provider || ''}${model || ''}${prompt}`;

  return [parsedUserId, cacheKey];
}

// // Simulated LLM API call
// async function callLLMService(body: string) {
//   return { message: `Processed request: ${body}` };
// }

//   // If not in cache, call LLM API (simulate with placeholder)
//   const newResponse = await callLLMService(event.body);

//   // Store response in cache
//   await storeInCache(userId, cacheKey, newResponse);

//   return {
//     statusCode: 200,
//     body: JSON.stringify({ fromCache: false, data: newResponse }),
//   };
// };
