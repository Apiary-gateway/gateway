import axios, { AxiosError } from 'axios';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Sha256 } from '@aws-crypto/sha256-js';

const region = process.env.AWS_REGION!;
const collectionEndpoint = process.env.OPENSEARCH_ENDPOINT!;
const indexName = process.env.OPENSEARCH_INDEX;
const credentialsProvider = defaultProvider();

export const handler = async (event: { documentId: string }) => {
  console.log('received event: ', JSON.stringify(event));
  
  const { documentId } = event;
  console.log(`Deleting document with ID: ${documentId}`);

  try {
    const response = await signedDelete(`/${indexName}/_doc/${documentId}`);
    console.log('response for delete document: ', JSON.stringify(response));
    return {
      statusCode: 200,
      message: `Document ${documentId} deleted successfully`,
    };
  } catch (err) {
    console.log('an error occurred: ', JSON.stringify(err));
  }
};

async function signedDelete(path: string) {
  try {
    const credentials = await credentialsProvider();

    const signer = new SignatureV4({
      credentials,
      region,
      service: 'aoss',
      sha256: Sha256,
    });

    const request = new HttpRequest({
      method: 'DELETE',
      protocol: 'https:',
      hostname: new URL(collectionEndpoint).hostname,
      path,
      headers: {
        'host': new URL(collectionEndpoint).hostname,
      },
    });

    const signedRequest = await signer.sign(request);

    const signedHeaders = signedRequest.headers;

    const response = await axios.delete(`${collectionEndpoint}${path}`, {
      headers: signedHeaders,
    });

    return response.data;
  } catch (err) {
    if (err instanceof AxiosError) {
      console.error('Response status code: ', err.response?.status, 'Axios error data: ', err.response?.data);
    } else {
      console.error('An error occurred: ', err);
    }
  }
}