import {
  BedrockClient,
  GetFoundationModelCommand,
} from '@aws-sdk/client-bedrock';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Sha256 } from '@aws-crypto/sha256-js';
import axios, { AxiosError } from 'axios';

const region = process.env.AWS_REGION!;
const collectionEndpoint = process.env.OPENSEARCH_ENDPOINT!;
const embeddingModelId = 'amazon.titan-embed-text-v2:0';
const credentialsProvider = defaultProvider();

const bedrock = new BedrockRuntimeClient({ region });
const bedrockControl = new BedrockClient({ region });

export async function getEmbedding(text: string): Promise<number[]> {
  try {
    // First verify we have access to the model
    await bedrockControl.send(
      new GetFoundationModelCommand({
        modelIdentifier: embeddingModelId,
      })
    );

    const command = new InvokeModelCommand({
      modelId: embeddingModelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({ inputText: text }),
    });

    const response = await bedrock.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    return body.embedding;
  } catch (error) {
    console.error('Error in getEmbedding:', error);
    throw error;
  }
}

export async function indexVector(index: string, document: object) {
  return await signedPost(`/${index}/_doc`, document);
}

export async function searchKNN(
  index: string,
  embedding: number[],
  k = 3
): Promise<{ _score: number; _source: any }[]> {
  const body = {
    size: k,
    query: {
      knn: {
        embedding: {
          vector: embedding,
          k,
        },
      },
    },
  };

  const response = await signedPost(`/${index}/_search`, body);
  return response?.hits?.hits ?? [];
}

export async function createVectorIndex(index: string, dimension: number) {
  return await signedPost(`/${index}`, {
    settings: {
      index: { knn: true },
    },
    mappings: {
      properties: {
        text: { type: 'text' },
        embedding: {
          type: 'knn_vector',
          dimension,
        },
      },
    },
  });
}

export async function signedPost(path: string, body: object) {
  console.log('path for signedPost: ', path);
  console.log('body for signedPost: ', body);
  try {
    const credentials = await credentialsProvider();
    const signer = new SignatureV4({
      credentials,
      region,
      service: 'aoss',
      sha256: Sha256,
    });

    const requestBody = JSON.stringify(body);

    const hostname = new URL(collectionEndpoint).hostname;

    const request = new HttpRequest({
      method: 'POST',
      protocol: 'https:',
      hostname,
      path,
      headers: {
        host: hostname,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(requestBody).toString(),
      },
      body: requestBody,
    });

    const signedRequest = await signer.sign(request);
    const headers = signedRequest.headers;

    const response = await axios.post(
      `${collectionEndpoint}${path}`,
      requestBody,
      {
        headers,
      }
    );

    console.log('response.data for signedPost: ', response.data);
    return response.data;
  } catch (err) {
    console.log('Error in signedPost: ', err);
    if (err instanceof AxiosError) {
      console.error('Axios error data: ', err.response?.data);
    } else {
      console.error('An error occurred: ', err);
    }
  }
}

// export async function signedGet(path: string) {
//   try {
//     // Parse the endpoint URL once
//     const endpointUrl = new URL(collectionEndpoint);
//     const credentials = await credentialsProvider();

//     // Prepare the SigV4 signer
//     const signer = new SignatureV4({
//       credentials,
//       region,
//       service: 'aoss',
//       sha256: Sha256,
//     });

//     // Construct the HttpRequest object for signing
//     const awsRequest = new HttpRequest({
//       method: 'GET',
//       protocol: endpointUrl.protocol, // e.g. 'https:'
//       hostname: endpointUrl.hostname, // e.g. 'j21gtd1mxyf8a70smf07.us-east-1.aoss.amazonaws.com'
//       // if your path param doesn't start with '/', add it here
//       path,
//       headers: {
//         host: endpointUrl.hostname,
//       },
//     });

//     // Sign using AWS SigV4
//     const signedRequest = await signer.sign(awsRequest);
//     const signedHeaders = signedRequest.headers;

//     // Build the final URL for Axios: base + path
//     // e.g. https://my-aoss-endpoint.com/_mget
//     const finalUrl = new URL(path, endpointUrl.origin).href;

//     // Make the actual GET request with signed headers
//     const response = await axios.get(finalUrl, {
//       headers: signedHeaders,
//     });

//     return response.data;
//   } catch (err) {
//     console.log('path for signedGet:', path);
//     console.log('Error in signedGet:', err);
//     if (err instanceof AxiosError) {
//       console.log('Axios error data: ', err.response?.data);
//     }
//     throw err; // Re-throw so caller can handle it
//   }
// }
