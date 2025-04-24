"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const protocol_http_1 = require("@aws-sdk/protocol-http");
const credential_provider_node_1 = require("@aws-sdk/credential-provider-node");
const signature_v4_1 = require("@aws-sdk/signature-v4");
const sha256_js_1 = require("@aws-crypto/sha256-js");
const axios_1 = __importStar(require("axios"));
const embedGuardrails_1 = require("./util/embedGuardrails");
const region = process.env.AWS_REGION;
const collectionEndpoint = process.env.OPENSEARCH_ENDPOINT;
const service = "aoss"; // for AWS OpenSearch Serverless
const credentialsProvider = (0, credential_provider_node_1.defaultProvider)();
const handler = async (event, context) => {
    const credentials = await credentialsProvider();
    const signer = new signature_v4_1.SignatureV4({
        credentials,
        service,
        region,
        sha256: sha256_js_1.Sha256,
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
    const checkIfIndexExistsRequest = new protocol_http_1.HttpRequest({
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
        const indexExists = await axios_1.default.request({ method, url: indexUrl, headers });
        console.log("Index already exists, response status:", indexExists.status);
        return { PhysicalResourceId: `Index-${indexName}` };
    }
    catch (err) {
        if (err instanceof axios_1.AxiosError && err.response?.status === 404) {
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
            };
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
            };
            const createIndexRequest = new protocol_http_1.HttpRequest({
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
            const response = await axios_1.default.request({
                method: signedCreateIndexRequest.method,
                url: indexUrl,
                headers: signedCreateIndexRequest.headers,
                data: signedCreateIndexRequest.body,
            });
            console.log("Index created: ", response.data);
        }
        else {
            console.error("Error checking or creating index: ", err);
            throw err;
        }
    }
    if (indexName === 'guardrails-index' && event.RequestType === 'Create') {
        console.log("Embedding and indexing guardrail utterances...");
        const bucket = event.ResourceProperties.guardrailsBucket;
        const key = event.ResourceProperties.guardrailsKey;
        await (0, embedGuardrails_1.embedAndIndexGuardrails)({ bucket, key });
    }
    return { PhysicalResourceId: `Index-${indexName}` };
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVjdG9ySW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9sYW1iZGEvdmVjdG9ySW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwREFBcUQ7QUFDckQsZ0ZBQW9FO0FBQ3BFLHdEQUFvRDtBQUNwRCxxREFBK0M7QUFDL0MsK0NBQTBDO0FBRTFDLDREQUFpRTtBQUVqRSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVcsQ0FBQztBQUN2QyxNQUFNLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW9CLENBQUM7QUFFNUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLENBQUMsZ0NBQWdDO0FBQ3hELE1BQU0sbUJBQW1CLEdBQUcsSUFBQSwwQ0FBZSxHQUFFLENBQUM7QUFFdkMsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTZCLEVBQUUsT0FBZ0IsRUFBRSxFQUFFO0lBQy9FLE1BQU0sV0FBVyxHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQztJQUVoRCxNQUFNLE1BQU0sR0FBRyxJQUFJLDBCQUFXLENBQUM7UUFDN0IsV0FBVztRQUNYLE9BQU87UUFDUCxNQUFNO1FBQ04sTUFBTSxFQUFFLGtCQUFNO0tBQ2YsQ0FBQyxDQUFDO0lBRUgsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQztJQUNyRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzdELE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRO1FBQ3RELENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUM7UUFDL0MsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUVULElBQUksS0FBSyxDQUFD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QUFLLENBQUMsa0JBQWtCLENBQUMsYUFBYSxDQUFDO1FBRW5ELE1BQU0sSUFBQSx5Q0FBdUIsRUFBQyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFRCxPQUFPLEVBQUMsa0JBQWtCLEVBQUUsU0FBUyxTQUFTLEVBQUUsRUFBQyxDQUFDO0FBQ3BELENBQUMsQ0FBQztBQXJIVyxRQUFBLE9BQU8sV0FxSGxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSHR0cFJlcXVlc3QgfSBmcm9tIFwiQGF3cy1zZGsvcHJvdG9jb2wtaHR0cFwiO1xuaW1wb3J0IHsgZGVmYXVsdFByb3ZpZGVyIH0gZnJvbSBcIkBhd3Mtc2RrL2NyZWRlbnRpYWwtcHJvdmlkZXItbm9kZVwiO1xuaW1wb3J0IHsgU2lnbmF0dXJlVjQgfSBmcm9tIFwiQGF3cy1zZGsvc2lnbmF0dXJlLXY0XCI7XG5pbXBvcnQgeyBTaGEyNTYgfSBmcm9tIFwiQGF3cy1jcnlwdG8vc2hhMjU2LWpzXCI7XG5pbXBvcnQgYXhpb3MsIHsgQXhpb3NFcnJvciB9IGZyb20gXCJheGlvc1wiO1xuaW1wb3J0IHsgQ2RrQ3VzdG9tUmVzb3VyY2VFdmVudCwgQ29udGV4dCB9IGZyb20gXCJhd3MtbGFtYmRhXCI7XG5pbXBvcnQgeyBlbWJlZEFuZEluZGV4R3VhcmRyYWlscyB9IGZyb20gXCIuL3V0aWwvZW1iZWRHdWFyZHJhaWxzXCI7XG5cbmNvbnN0IHJlZ2lvbiA9IHByb2Nlc3MuZW52LkFXU19SRUdJT04hO1xuY29uc3QgY29sbGVjdGlvbkVuZHBvaW50ID0gcHJvY2Vzcy5lbnYuT1BFTlNFQVJDSF9FTkRQT0lOVCE7XG5cbmNvbnN0IHNlcnZpY2UgPSBcImFvc3NcIjsgLy8gZm9yIEFXUyBPcGVuU2VhcmNoIFNlcnZlcmxlc3NcbmNvbnN0IGNyZWRlbnRpYWxzUHJvdmlkZXIgPSBkZWZhdWx0UHJvdmlkZXIoKTtcblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IENka0N1c3RvbVJlc291cmNlRXZlbnQsIGNvbnRleHQ6IENvbnRleHQpID0+IHtcbiAgY29uc3QgY3JlZGVudGlhbHMgPSBhd2FpdCBjcmVkZW50aWFsc1Byb3ZpZGVyKCk7XG5cbiAgY29uc3Qgc2lnbmVyID0gbmV3IFNpZ25hdHVyZVY0KHtcbiAgICBjcmVkZW50aWFscyxcbiAgICBzZXJ2aWNlLFxuICAgIHJlZ2lvbixcbiAgICBzaGEyNTY6IFNoYTI1NixcbiAgfSk7XG5cbiAgY29uc3QgaW5kZXhOYW1lID0gZXZlbnQuUmVzb3VyY2VQcm9wZXJ0aWVzLmluZGV4TmFtZTtcbiAgY29uc3QgZGltZW5zaW9uID0gTnVtYmVyKGV2ZW50LlJlc291cmNlUHJvcGVydGllcy5kaW1lbnNpb24pO1xuICBjb25zdCBjdXN0b21NYXBwaW5ncyA9IGV2ZW50LlJlc291cmNlUHJvcGVydGllcy5tYXBwaW5nc1xuICAgID8gSlNPTi5wYXJzZShldmVudC5SZXNvdXJjZVByb3BlcnRpZXMubWFwcGluZ3MpXG4gICAgOiBudWxsO1xuXG4gIGlmIChldmVudC5SZXF1ZXN0VHlwZSA9PT0gXCJEZWxldGVcIikge1xuICAgIGNvbnN0IGluZGV4TmFtZSA9IGV2ZW50LlJlc291cmNlUHJvcGVydGllcy5pbmRleE5hbWU7XG4gICAgY29uc3QgcGh5c2ljYWxJZCA9IGV2ZW50LlBoeXNpY2FsUmVzb3VyY2VJZCB8fCBgSW5kZXgtJHtpbmRleE5hbWV9YDtcbiAgICAgIGNvbnNvbGUubG9nKGBTa2lwcGluZyBkZWxldGUgZm9yIGluZGV4ICcke2luZGV4TmFtZX0nIChub3Qgc3VwcG9ydGVkIG9yIHNhZmUgdG8gaWdub3JlKS5gKTtcbiAgICAgIHJldHVybiB7IFBoeXNpY2FsUmVzb3VyY2VJZDogcGh5c2ljYWxJZCB9OyBcbiAgfVxuXG4gIGNvbnN0IGNoZWNrSWZJbmRleEV4aXN0c1JlcXVlc3QgPSBuZXcgSHR0cFJlcXVlc3Qoe1xuICAgIG1ldGhvZDogXCJIRUFEXCIsXG4gICAgaG9zdG5hbWU6IG5ldyBVUkwoY29sbGVjdGlvbkVuZHBvaW50KS5ob3N0bmFtZSxcbiAgICBwYXRoOiBgLyR7aW5kZXhOYW1lfWAsXG4gICAgaGVhZGVyczoge1xuICAgICAgaG9zdDogbmV3IFVSTChjb2xsZWN0aW9uRW5kcG9pbnQpLmhvc3RuYW1lLFxuICAgIH0sXG4gIH0pO1xuXG4gIGNvbnN0IHNpZ25lZFJlcXVlc3QgPSBhd2FpdCBzaWduZXIuc2lnbihjaGVja0lmSW5kZXhFeGlzdHNSZXF1ZXN0KTtcblxuICBjb25zdCB7IG1ldGhvZCwgaGVhZGVycyB9ID0gc2lnbmVkUmVxdWVzdDtcbiAgY29uc3QgaW5kZXhVcmwgPSBgJHtjb2xsZWN0aW9uRW5kcG9pbnR9LyR7aW5kZXhOYW1lfWA7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBpbmRleEV4aXN0cyA9IGF3YWl0IGF4aW9zLnJlcXVlc3QoeyBtZXRob2QsIHVybDogaW5kZXhVcmwsIGhlYWRlcnMgfSk7XG4gICAgY29uc29sZS5sb2coXCJJbmRleCBhbHJlYWR5IGV4aXN0cywgcmVzcG9uc2Ugc3RhdHVzOlwiLCBpbmRleEV4aXN0cy5zdGF0dXMpO1xuICAgIHJldHVybiB7UGh5c2ljYWxSZXNvdXJjZUlkOiBgSW5kZXgtJHtpbmRleE5hbWV9YH07XG4gIH0gY2F0Y2ggKGVycjogdW5rbm93bikge1xuICAgIGlmIChlcnIgaW5zdGFuY2VvZiBBeGlvc0Vycm9yICYmIGVyci5yZXNwb25zZT8uc3RhdHVzID09PSA0MDQpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBJbmRleCAnJHtpbmRleE5hbWV9JyBub3QgZm91bmQsIGNyZWF0aW5nLi4uYCk7XG5cbiAgICAgIGNvbnN0IGRlZmF1bHRNYXBwaW5ncyA9IHtcbiAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgIGVtYmVkZGluZzoge1xuICAgICAgICAgICAgdHlwZTogXCJrbm5fdmVjdG9yXCIsXG4gICAgICAgICAgICBkaW1lbnNpb24sXG4gICAgICAgICAgICBtZXRob2Q6IHtcbiAgICAgICAgICAgICAgZW5naW5lOiBcIm5tc2xpYlwiLCAvLyBub24tbWV0cmljIHNwYWNlIGxpYnJhcnkgKGFwcHJveC4gbm4gc2VhcmNoIGxpYnJhcnkpXG4gICAgICAgICAgICAgIHNwYWNlX3R5cGU6IFwiY29zaW5lc2ltaWxcIixcbiAgICAgICAgICAgICAgbmFtZTogXCJobnN3XCIsIC8vIGhlaXJhcmNoaWNhbCBuYXZpZ2FibGUgc21hbGwgd29ybGQgKGdyYXBoLWJhc2VkIGFubiBhbGdvcml0aG0pXG4gICAgICAgICAgICAgIHBhcmFtZXRlcnM6IHt9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBsbG1SZXNwb25zZTogeyB0eXBlOiBcInRleHRcIiB9LFxuICAgICAgICAgIHJlcXVlc3RUZXh0OiB7IHR5cGU6IFwidGV4dFwiIH0sXG4gICAgICAgICAgbW9kZWw6IHsgdHlwZTogXCJrZXl3b3JkXCIgfSxcbiAgICAgICAgICBwcm92aWRlcjogeyB0eXBlOiBcImtleXdvcmRcIiB9LFxuICAgICAgICAgIHRpbWVzdGFtcDogeyB0eXBlOiBcImRhdGVcIiB9LFxuICAgICAgICAgIHVzZXJJZDogeyB0eXBlOiBcImtleXdvcmRcIiB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgaW5kZXggPSB7XG4gICAgICAgIGFsaWFzZXM6IHt9LFxuICAgICAgICBtYXBwaW5nczogY3VzdG9tTWFwcGluZ3MgfHwgZGVmYXVsdE1hcHBpbmdzLFxuICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgIGluZGV4OiB7XG4gICAgICAgICAgICBudW1iZXJfb2Zfc2hhcmRzOiBcIjJcIixcbiAgICAgICAgICAgIFwia25uLmFsZ29fcGFyYW1cIjogeyBlZl9zZWFyY2g6IFwiNTEyXCIgfSxcbiAgICAgICAgICAgIGtubjogXCJ0cnVlXCIsXG4gICAgICAgICAgICBudW1iZXJfb2ZfcmVwbGljYXM6IFwiMFwiXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNyZWF0ZUluZGV4UmVxdWVzdCA9IG5ldyBIdHRwUmVxdWVzdCh7XG4gICAgICAgIG1ldGhvZDogXCJQVVRcIixcbiAgICAgICAgaG9zdG5hbWU6IG5ldyBVUkwoY29sbGVjdGlvbkVuZHBvaW50KS5ob3N0bmFtZSxcbiAgICAgICAgcGF0aDogYC8ke2luZGV4TmFtZX1gLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgaG9zdDogbmV3IFVSTChjb2xsZWN0aW9uRW5kcG9pbnQpLmhvc3RuYW1lLFxuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShpbmRleCksXG4gICAgICB9KTtcblxuICAgICAgY29uc3Qgc2lnbmVkQ3JlYXRlSW5kZXhSZXF1ZXN0ID0gYXdhaXQgc2lnbmVyLnNpZ24oY3JlYXRlSW5kZXhSZXF1ZXN0KTtcblxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvcy5yZXF1ZXN0KHtcbiAgICAgICAgbWV0aG9kOiBzaWduZWRDcmVhdGVJbmRleFJlcXVlc3QubWV0aG9kLFxuICAgICAgICB1cmw6IGluZGV4VXJsLFxuICAgICAgICBoZWFkZXJzOiBzaWduZWRDcmVhdGVJbmRleFJlcXVlc3QuaGVhZGVycyxcbiAgICAgICAgZGF0YTogc2lnbmVkQ3JlYXRlSW5kZXhSZXF1ZXN0LmJvZHksXG4gICAgICB9KTtcblxuICAgICAgY29uc29sZS5sb2coXCJJbmRleCBjcmVhdGVkOiBcIiwgcmVzcG9uc2UuZGF0YSk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIGNoZWNraW5nIG9yIGNyZWF0aW5nIGluZGV4OiBcIiwgZXJyKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH1cblxuICBpZiAoaW5kZXhOYW1lID09PSAnZ3VhcmRyYWlscy1pbmRleCcgJiYgZXZlbnQuUmVxdWVzdFR5cGUgPT09ICdDcmVhdGUnKSB7XG4gICAgY29uc29sZS5sb2coXCJFbWJlZGRpbmcgYW5kIGluZGV4aW5nIGd1YXJkcmFpbCB1dHRlcmFuY2VzLi4uXCIpO1xuXG4gICAgY29uc3QgYnVja2V0ID0gZXZlbnQuUmVzb3VyY2VQcm9wZXJ0aWVzLmd1YXJkcmFpbHNCdWNrZXQ7XG4gICAgY29uc3Qga2V5ID0gZXZlbnQuUmVzb3VyY2VQcm9wZXJ0aWVzLmd1YXJkcmFpbHNLZXk7XG5cbiAgICBhd2FpdCBlbWJlZEFuZEluZGV4R3VhcmRyYWlscyh7IGJ1Y2tldCwga2V5IH0pO1xuICB9XG5cbiAgcmV0dXJuIHtQaHlzaWNhbFJlc291cmNlSWQ6IGBJbmRleC0ke2luZGV4TmFtZX1gfTtcbn07XG5cbiJdfQ==