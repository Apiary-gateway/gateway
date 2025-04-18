
import { AxiosError } from 'axios';
import { signedPost } from './vectorSearch';
import { getConfig } from './getConfig';
import { SchedulerClient, CreateScheduleCommand } from "@aws-sdk/client-scheduler";
import { v4 as uuidv4 } from "uuid";


// TODO
// Check supported Bedrock regions and validate regional support in CDK stack
// test different embedding sizes? 1024, 512, and 256 options for Titan v2
// if embedding request fails, just move on - right? 
// include cache hit or miss header in response from `router`
// format cached response better - ex. tokens used = 0

const indexName = process.env.OPENSEARCH_INDEX;
<<<<<<< Updated upstream
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
=======
>>>>>>> Stashed changes

export async function checkSemanticCache(
  requestEmbedding: number[],
  userId?: string,
  provider?: string,
  model?: string
) { 
  const config = getConfig();
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
  const similarityThreshold = config.cache.semanticCacheThreshold;
  [ userId, provider, model ] = getFilters(userId, provider, model);

  // KNN is K-nearest neighbors, where K is number of nearest neighbors to get  
  const knnQuery = {
    size: 1,
    query: {
      knn: {
        embedding: {
          vector: requestEmbedding,
          k: 1
        }
      }
    },
    post_filter: {
      bool: {
        must: [
          { term: { userId: {value: userId} } },
          { term: { provider: {value: provider} } },
          { term: { model: {value: model} } },
        ]
      }  
    }
  }

  const response = await signedPost(`/${indexName}/_search`, knnQuery);

  const topHit = response.hits?.hits?.[0];
  const similarityScore = topHit?._score;

  return similarityScore && similarityScore >= similarityThreshold ?
    topHit._source.llmResponse : null;
}

export async function addToSemanticCache(
  embedding: number[],
  prompt: string, 
  llmResponse: string,
  userId?: string,
  provider?: string,
  model?: string
) {
  try {
    [ userId, provider, model ] = getFilters(userId, provider, model);
    
    const response = await signedPost(`/${indexName}/_doc`, {
      userId,
      provider,
      model,
      embedding,
      requestText: prompt,
      llmResponse,
      timestamp: new Date().toISOString()
    });

    await scheduleDelete(response._id);

    console.log('successfully added to semantic cache: ', JSON.stringify(response));
  } catch (err) {
    if (err instanceof AxiosError) {
      console.log('Axios error in addToSemanticCache: ', err.response?.data);
    } else{
      console.log('error in addToSemanticCache: ', err);
    }
  }
}

async function scheduleDelete(documentId: string) {
  console.log(`scheduling delete for document: ${documentId}`);
  
  const scheduler = new SchedulerClient({});
  const config = getConfig();
  const CACHE_TTL_MS = config.cache.semanticCacheTtlSeconds * 1000 || 300 * 1000; 

  let runAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
  const runAtFormatMatch = runAt.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  if (runAtFormatMatch) {
    runAt = runAtFormatMatch[0];
  };

  const command = new CreateScheduleCommand({
    Name: `delete-doc-${uuidv4()}`,
    ScheduleExpression: `at(${runAt})`,
    FlexibleTimeWindow: { Mode: "OFF" },
    Target: {
      Arn: process.env.DELETE_DOCUMENT_LAMBDA_ARN,
      RoleArn: process.env.SCHEDULER_ROLE_ARN,
      Input: JSON.stringify({ documentId }),
    },
  });

  const response = await scheduler.send(command);
  console.log(`Document scheduled for deletion. Scheduler response: ${JSON.stringify(response)}`);
  
  return {
    message: `Document scheduled for deletion. Scheduler response: ${JSON.stringify(response)}`,
  };
}

function getFilters(  
  userId?: string,
  provider?: string,
  model?: string
) {
  userId = userId ? userId : 'global';
  provider = provider ? provider : '';
  model = model ? model : '';

  return [userId, provider, model];
}

/*
Known working OSS endpoints:
  * '/semantic-cache-index' (GET request returns index schema)
  * '/semantic-cache-index/_search'
  * 
*/
