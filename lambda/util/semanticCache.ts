import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import axios from 'axios';
import { RequestPayload } from '../router';
import { CompletionResponse } from 'token.js';

// TODO
// Check supported Bedrock regions and validate regional support in CDK stack
// test different embedding sizes? 1024, 512, and 256 options for Titan v2
// if embedding request fails, just move on - right? 
// include cache hit or miss header in response from `router`
// format cached response better - ex. tokens used = 0

const bedrock = new BedrockRuntimeClient({
  // should specify the region where the Lambda is running
  region: process.env.AWS_REGION
});
const collectionEndpoint = process.env.OPENSEARCH_ENDPOINT;
const indexName = process.env.OPENSEARCH_INDEX;
const embeddingModelId = 'amazon.titan-embed-text-v2:0';
const similarityThreshold = 0.9;

export async function getEmbedding(prompt: string): Promise<number[]> {
  const command = new InvokeModelCommand({
    modelId: embeddingModelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({ inputText: prompt }),
    // performanceConfigLatency: 'optimized',
  });

  const response = await bedrock.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.embedding;
}

export async function checkSemanticCache(
  requestBody: RequestPayload, 
  embedding: number[]
) {
  let { userId, provider, model } = requestBody;
  userId = userId ? userId : 'global';

  // KNN is K-nearest neighbors, where K is number of nearest neighbors to get
  const knnQuery = {
    knn: {
      field: 'embedding',
      k: 1,
      vector: embedding,
      filter: {
        bool: {
          must: [
            { term: { userId } },
            { term: { provider } },
            { term: { model } }
          ]
        }
      }
    }
  };

  const response = await axios.post(`${collectionEndpoint}/${indexName}/_search`, knnQuery, {
    headers: { 'Content-Type': 'application/json' }
  });

  return response.data;

  // const topHit = response.data.hits?.hits?.[0];
  // const similarityScore = topHit?._score;

  // return similarityScore && similarityScore >= similarityThreshold ?
  //   topHit._source.llmResponse : null;
}

export async function addToSemanticCache(
  requestBody: RequestPayload, 
  embedding: number[], 
  llmResponse: { text: string, usage: CompletionResponse['usage'] }
) {
  // let { userId, provider, model } = requestBody;
  // userId = userId ? userId : 'global';
  
  // const response = await axios.post(`${collectionEndpoint}/${indexName}/_doc`, {
  //   userId,
  //   provider,
  //   model,
  //   // requestText: prompt,
  //   embedding,
  //   llmResponse,
  //   timestamp: new Date().toISOString()
  // }, {
  //   headers: { 'Content-Type': 'application/json' }
  // });

  // // for debugging
  // console.log('successfully added to semantic cache: ', response.data);

  try {
    const result = await axios.get(`${collectionEndpoint}`);
    console.log('OpenSearch domain accessible:', result.data);
  } catch (err) {
    console.log('Test failed:', err);
  }
}
