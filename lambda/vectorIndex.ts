import { HttpRequest } from "@aws-sdk/protocol-http";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
import axios, { AxiosError } from "axios";
import { CdkCustomResourceEvent, Context } from "aws-lambda";
import { embedAndIndexGuardrails } from "./util/embedGuardrails";
import * as https from "https";

const region = process.env.AWS_REGION!;
const collectionEndpoint = process.env.OPENSEARCH_ENDPOINT!;
// const indexName = process.env.OPENSEARCH_INDEX;
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

  const indexName = event.ResourceProperties.indexName;
  const dimension = Number(event.ResourceProperties.dimension);
  const customMappings = event.ResourceProperties.mappings
    ? JSON.parse(event.ResourceProperties.mappings)
    : null;

  // const physicalResourceId = `Index-${indexName}`;

  if (event.RequestType === "Delete") {
    const indexName = event.ResourceProperties.indexName;
    const physicalId = event.PhysicalResourceId || `Index-${indexName}`;
      console.log(`Skipping delete for index '${indexName}' (not supported or safe to ignore).`);
      return { PhysicalResourceId: physicalId }; 
  }

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

      const defaultMappings = {
        properties: {
          embedding: {
            type: "knn_vector",
            dimension,
            method: {
              engine: "nmslib", // non-metric space library (approx. nn search library)
              space_type: "cosinesimil",
              name: "hnsw", // heirarchical navigable small world (graph-based ann algorithm)
              parameters: {}
            }
          },
          llmResponse: { type: "text" },
          requestText: { type: "text" },
          model: { type: "keyword" },
          provider: { type: "keyword" },
          timestamp: { type: "date" },
          userId: { type: "keyword" }
        }
      }

      const index = {
        aliases: {},
        mappings: customMappings || defaultMappings,
        settings: {
          index: {
            number_of_shards: "2",
            "knn.algo_param": { ef_search: "512" },
            knn: "true",
            number_of_replicas: "0"
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

    } else {
      console.error("Error checking or creating index: ", err);
      // await sendCfnResponse(event, context, 'FAILED');
      throw err;
    }
  }

  if (indexName === 'guardrails-index' && event.RequestType === 'Create') {
    console.log("Embedding and indexing guardrail utterances...");

    const bucket = event.ResourceProperties.guardrailsBucket;
    const key = event.ResourceProperties.guardrailsKey;

    await embedAndIndexGuardrails({ bucket, key });
  }

  return {PhysicalResourceId: `Index-${indexName}`};
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
  return message
    .replace(/X-Amz-Credential=[^&\s]+/i, 'X-Amz-Credential=*****')
    .replace(/X-Amz-Signature=[^&\s]+/i, 'X-Amz-Signature=*****');
}
