import { HttpRequest } from "@aws-sdk/protocol-http";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
import axios, { AxiosError } from "axios";
import { CdkCustomResourceEvent, Context } from "aws-lambda";
import { embedAndIndexGuardrails } from "./util/embedGuardrails";

const region = process.env.AWS_REGION!;
const collectionEndpoint = process.env.OPENSEARCH_ENDPOINT!;

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

    } else {
      console.error("Error checking or creating index: ", err);
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

