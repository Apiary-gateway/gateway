import { 
  DynamoDBClient, 
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { getConfig } from './getConfig';

const dynamoClient = new DynamoDBClient();
const CACHE_TABLE_NAME = process.env.CACHE_TABLE_NAME || '';

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
  return result.Item ? result.Item.llmResponse.S?.trim() : null;
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
  const config = getConfig();
  const CACHE_TTL_SECONDS = config.cache.simpleCacheTtlSeconds || 300;
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
