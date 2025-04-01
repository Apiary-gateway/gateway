import { 
  DynamoDBClient, 
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import type { CompletionResponse } from 'token.js';

// TODOS
// include cache hit or miss header in response from `router`
// format cached response better - ex. tokens used = 0
// add to README - optional `userId` field in request body for cache partitioning
// add configuration to `router` function to conditionally check just simple cache or both simple & semantic

const dynamoClient = new DynamoDBClient();
const CACHE_TABLE_NAME = process.env.CACHE_TABLE_NAME || '';
const CACHE_TTL_SECONDS = 60 * 5; // 5 minutes

function getUserId(userId?: string): string {
  return userId ? userId : 'global';
}

function getCacheKey(  
  prompt: string,
  provider?: string, 
  model?: string
): string {
  return `${provider || ''}${model || ''}${prompt}`;
}

export async function checkSimpleCache(
  prompt: string,
  userId?: string, 
  provider?: string, 
  model?: string, 
) {
  userId = getUserId(userId);
  const cacheKey = getCacheKey(prompt, provider, model);

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
  // console.log('fetched from Dynamo: ', result.Item ? result.Item.llmResponse : 'no cache hit');
  return result.Item ? result.Item.llmResponse : null;
}

// Function to store result in cache
export async function addToSimpleCache(
  prompt: string, 
  llmResponse: string,
  userId?: string, 
  provider?: string, 
  model?: string, 
) {
  userId = getUserId(userId);
  const cacheKey = getCacheKey(prompt, provider, model);
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
      provider: {
        S: provider || ''
      },
      model: {
        S: model || ''
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
