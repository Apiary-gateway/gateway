import { 
  DynamoDBClient, 
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { RequestPayload } from '../router';

// TODOS
// add cache check/add to cache logic to `router`
// include cache hit or miss header in response from `router`
// add to README - optional `userId` field in request body for cache partitioning
// check in the console that TTL is enabled 

const dynamoClient = new DynamoDBClient();
const CACHE_TABLE_NAME = process.env.CACHE_TABLE_NAME || '';
const CACHE_TTL_SECONDS = 60 * 5; // 5 minutes

export const checkCache = async (body: RequestPayload) => {
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
    // ProjectionExpression: 'llmResponse',
  };
  
  const command = new GetItemCommand(input);
  const result = await dynamoClient.send(command);
  console.log('fetched from Dynamo: ', result.Item ? result.Item.llmResponse : 'no cache hit');
  return result.Item ? result.Item.llmResponse : null;
}

// Function to store result in cache
async function storeInCache(body: RequestPayload, llmResponse: string) {
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
        S: llmResponse
      }, 
      ttl: {
        N: String(ttl)
      }
    },
  };
  
  const command = new PutItemCommand(input);
  // don't await - no need to wait here. Check that it still works though
  dynamoClient.send(command);
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
