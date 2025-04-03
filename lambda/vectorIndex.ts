import { HttpRequest } from "@aws-sdk/protocol-http";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
import axios, { AxiosError } from "axios";
import { CdkCustomResourceEvent, Context } from "aws-lambda";
import * as https from "https";

const region = process.env.AWS_REGION!;
const collectionEndpoint = process.env.OPENSEARCH_ENDPOINT!;
const indexName = process.env.OPENSEARCH_INDEX;
const service = "aoss"; // for AWS OpenSearch Serverless
const credentialsProvider = defaultProvider();

export const handler = async (event: CdkCustomResourceEvent, context: Context) => {
  const credentials = await credentialsProvider();

  const signer = new SignatureV4({
    credentials,
    service,
    region,
    sha256: Sha256,
  });

  const checkIfIndexExistsRequest = new HttpRequest({
    method: "HEAD",
    hostname: new URL(collectionEndpoint).hostname,
    path: `/${indexName}`,
    headers: {
      host: new URL(collectionEndpoint).hostname,
    },
  });

  const signedRequest = await signer.sign(checkIfIndexExistsRequest);

  const { method, headers } = signedRequest;
  const indexUrl = `${collectionEndpoint}/${indexName}`;

  try {
    const indexExists = await axios.request({ method, url: indexUrl, headers });
    console.log("Index already exists, response status:", indexExists.status);
    // await sendCfnResponse(event, context, 'SUCCESS', {message: 'Index already exists'});
    return {PhysicalResourceId: `Index-${indexName}`};
  } catch (err: unknown) {
    if (err instanceof AxiosError && err.response?.status === 404) {
      console.log(`Index '${indexName}' not found, creating...`);

      const index = {
        "aliases": {},
        "mappings": {
          "properties": {
            "embedding": {
              "type": "knn_vector",
              "dimension": 1024,
              "method": {
                "engine": "nmslib",
                "space_type": "cosinesimil",
                "name": "hnsw",
                "parameters": {}
              }
            },
            "llmResponse": {
              "type": "text"
            },
            "requestText": {
              "type": "text"
            },
            "model": {
              "type": "keyword"
            },
            "provider": {
              "type": "keyword"
            },
            "timestamp": {
              "type": "date"
            },
            "userId": {
              "type": "keyword"
            }
          }
        },
        "settings": {
          "index": {
            "number_of_shards": "2",
            "knn.algo_param": {
                "ef_search": "512"
            },
            "knn": "true",
            "number_of_replicas": "0"
          }
        }
      }

      const createIndexRequest = new HttpRequest({
        method: "PUT",
        hostname: new URL(collectionEndpoint).hostname,
        path: `/${indexName}`,
        headers: {
          host: new URL(collectionEndpoint).hostname,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(index),
      });

      const signedCreateIndexRequest = await signer.sign(createIndexRequest);

      const response = await axios.request({
        method: signedCreateIndexRequest.method,
        url: indexUrl,
        headers: signedCreateIndexRequest.headers,
        data: signedCreateIndexRequest.body,
      });

      console.log("Index created: ", response.data);
      // await sendCfnResponse(event, context, 'SUCCESS', {message: 'Index created'});
      return {PhysicalResourceId: `Index-${indexName}`};
    } else {
      console.error("Error checking or creating index: ", err);
      // await sendCfnResponse(event, context, 'FAILED');
      throw err;
    }
  }
};

// Using Provider framework - shouldn't need this function anymore
async function sendCfnResponse(
  event: CdkCustomResourceEvent, 
  context: Context, 
  responseStatus: 'SUCCESS' | 'FAILED', 
  responseData?: unknown, 
  physicalResourceId?: string, 
  noEcho?: boolean
) {
  console.log('full event: ', JSON.stringify(event));
  
  const responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
    PhysicalResourceId: physicalResourceId || context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    NoEcho: noEcho || false,
    Data: responseData || {},
  });

  console.log("Response body:\n", responseBody);

  const parsedUrl = new URL(event.ResponseURL);
  console.log('parsed response URL: ', parsedUrl);
  
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.pathname,
    method: "PUT",
    headers: {
      "content-type": "",
      "content-length": Buffer.byteLength(responseBody)
    }
  };

  return new Promise<void>((resolve, reject) => {
    const request = https.request(options, (response) => {
      console.log("CloudFormation response status code: ", response.statusCode);
      console.log("CloudFormation response: ", JSON.stringify(response));
      resolve();
    });
  
    request.on("error", (error) => {
      console.log("send(..) failed executing https.request(..): " + maskCredentialsAndSignature(String(error)));
      reject(error);
    });
  
    request.write(responseBody);
    request.end();
  });
}

function maskCredentialsAndSignature(message: string) {
  return message.replace(/X-Amz-Credential=[^&\s]+/i, 'X-Amz-Credential=*****')
    .replace(/X-Amz-Signature=[^&\s]+/i, 'X-Amz-Signature=*****');
}
