import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import axios, { AxiosError } from 'axios';
import { CompletionResponse } from 'token.js';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Sha256 } from '@aws-crypto/sha256-js';

// TODO
// Check supported Bedrock regions and validate regional support in CDK stack
// test different embedding sizes? 1024, 512, and 256 options for Titan v2
// if embedding request fails, just move on - right? 
// include cache hit or miss header in response from `router`
// format cached response better - ex. tokens used = 0

const region = process.env.AWS_REGION!;
const collectionEndpoint = process.env.OPENSEARCH_ENDPOINT!;
const indexName = process.env.OPENSEARCH_INDEX;
const credentialsProvider = defaultProvider();
const embeddingModelId = 'amazon.titan-embed-text-v2:0';
const similarityThreshold = 0.85;
const bedrock = new BedrockRuntimeClient({
  // should specify the region where the Lambda is running
  region,
});

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

    // console.log('successfully added to semantic cache: ', JSON.stringify(response));
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

async function signedPost(path: string, body: object) {
  try {
    const credentials = await credentialsProvider();

    const signer = new SignatureV4({
      credentials,
      region,
      service: 'aoss',
      sha256: Sha256,
    });

    const requestBody = JSON.stringify(body);

    const request = new HttpRequest({
      method: 'POST',
      protocol: 'https:',
      hostname: new URL(collectionEndpoint).hostname,
      path,
      headers: {
        'host': new URL(collectionEndpoint).hostname,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(requestBody).toString(),
      },
      body: requestBody,
    });

    const signedRequest = await signer.sign(request);

    const signedHeaders = signedRequest.headers;

    const response = await axios.post(`${collectionEndpoint}${path}`, requestBody, {
      headers: signedHeaders,
    });

    return response.data;
  } catch (err) {
    if (err instanceof AxiosError) {
      console.error('Axios error data: ', err.response?.data);
    } else {
      console.error('An error occurred: ', err);
    }
  }
}

async function signedGet(path: string) {
  try {
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
      hostname: new URL(collectionEndpoint).hostname,
      path,
      headers: {
        host: new URL(collectionEndpoint).hostname,
      },
    });
  
    const signedRequest = await signer.sign(request);

    const signedHeaders = signedRequest.headers;
  
    const response = await axios.get(`${collectionEndpoint}${path}`, {
      headers: signedHeaders,
    });
  
    return response.data;
  } catch (err) {
    if (err instanceof AxiosError) {
      console.log('Axios error data: ', err.response?.data);
    } else {
      console.log('An error occurred: ', err);
    }
  }
}

/*
Known working OSS endpoints:
  * '/semantic-cache-index' (GET request returns index schema)
  * '/semantic-cache-index/_search'
  * 
*/
