import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import axios, { AxiosError } from 'axios';
import { RequestPayload } from '../router';
import { CompletionResponse } from 'token.js';

import { HttpRequest } from '@aws-sdk/protocol-http';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Sha256 } from '@aws-crypto/sha256-js';

const region = process.env.AWS_REGION!;
const endpoint = process.env.OPENSEARCH_ENDPOINT!; // Should look like https://abc.collection.region.aoss.amazonaws.com
const credentialsProvider = defaultProvider();

export async function signedGet(path: string) {
  try {
    // console.log('OpenSearch endpoint:', endpoint);

    const credentials = await credentialsProvider();
  
    const signer = new SignatureV4({
      credentials,
      region,
      service: 'aoss',
      sha256: Sha256,
    });
  
    const request = new HttpRequest({
      method: 'GET',
      protocol: 'https:',
      hostname: new URL(endpoint).hostname,
      path,
      headers: {
        host: new URL(endpoint).hostname,
      },
    });
  
    const signedRequest = await signer.sign(request);
  
    const signedHeaders = signedRequest.headers;
  
    const response = await axios.get(`${endpoint}${path}`, {
      headers: signedHeaders,
    });
  
    return response.data;
  } catch (err) {
    if (err instanceof AxiosError) {
      console.log('Axios error data: ', err.response?.data);
    }
  }
}


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
  try {
    const result = await axios.get(`${collectionEndpoint}/_cat/indices?v&expand_wildcards=all`);
    return result;
  } catch (err) {
    console.log('Test failed:', err);
  }
  
  // let { userId, provider, model } = requestBody;
  // userId = userId ? userId : 'global';

  // // KNN is K-nearest neighbors, where K is number of nearest neighbors to get
  // const knnQuery = {
  //   knn: {
  //     field: 'embedding',
  //     k: 1,
  //     vector: embedding,
  //     filter: {
  //       bool: {
  //         must: [
  //           { term: { userId } },
  //           { term: { provider } },
  //           { term: { model } }
  //         ]
  //       }
  //     }
  //   }
  // };

  // const response = await axios.post(`${collectionEndpoint}/${indexName}/_search`, knnQuery, {
  //   headers: { 'Content-Type': 'application/json' }
  // });

  // return response.data;

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
}
