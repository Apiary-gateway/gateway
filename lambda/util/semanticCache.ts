import { AxiosError } from 'axios';
import { signedPost } from './vectorSearch';
import { config } from './config/config';

// TODO
// Check supported Bedrock regions and validate regional support in CDK stack
// test different embedding sizes? 1024, 512, and 256 options for Titan v2
// if embedding request fails, just move on - right? 
// include cache hit or miss header in response from `router`
// format cached response better - ex. tokens used = 0

const indexName = process.env.OPENSEARCH_INDEX;
const similarityThreshold = config.cache.semanticCacheThreshold; // pull from config

export async function checkSemanticCache(
  requestEmbedding: number[],
  userId?: string,
  provider?: string,
  model?: string
) { 
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

  } catch (err) {
    if (err instanceof AxiosError) {
      console.log('Axios error in addToSemanticCache: ', err.response?.data);
    } else{
      console.log('error in addToSemanticCache: ', err);
    }
  }
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
