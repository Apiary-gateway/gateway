import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
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

export async function getEmbedding(text: string): Promise<number[]> {
  const command = new InvokeModelCommand({
    modelId: embeddingModelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({ inputText: text }),
  });

  const response = await bedrock.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.embedding;
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
    
        const response = await axios.post(`${collectionEndpoint}${path}`, requestBody, {
            headers,
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
