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
exports.getEmbedding = getEmbedding;
exports.indexVector = indexVector;
exports.searchKNN = searchKNN;
exports.createVectorIndex = createVectorIndex;
exports.signedPost = signedPost;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const protocol_http_1 = require("@aws-sdk/protocol-http");
const signature_v4_1 = require("@aws-sdk/signature-v4");
const credential_provider_node_1 = require("@aws-sdk/credential-provider-node");
const sha256_js_1 = require("@aws-crypto/sha256-js");
const axios_1 = __importStar(require("axios"));
const region = process.env.AWS_REGION;
const collectionEndpoint = process.env.OPENSEARCH_ENDPOINT;
const embeddingModelId = 'amazon.titan-embed-text-v2:0';
const credentialsProvider = (0, credential_provider_node_1.defaultProvider)();
const bedrock = new client_bedrock_runtime_1.BedrockRuntimeClient({ region });
async function getEmbedding(text) {
    const command = new client_bedrock_runtime_1.InvokeModelCommand({
        modelId: embeddingModelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({ inputText: text }),
    });
    const response = await bedrock.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    return body.embedding;
}
async function indexVector(index, document) {
    return await signedPost(`/${index}/_doc`, document);
}
async function searchKNN(index, embedding, k = 3) {
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
async function createVectorIndex(index, dimension) {
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
async function signedPost(path, body) {
    try {
        const credentials = await credentialsProvider();
        const signer = new signature_v4_1.SignatureV4({
            credentials,
            region,
            service: 'aoss',
            sha256: sha256_js_1.Sha256,
        });
        const requestBody = JSON.stringify(body);
        const hostname = new URL(collectionEndpoint).hostname;
        const request = new protocol_http_1.HttpRequest({
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
        const response = await axios_1.default.post(`${collectionEndpoint}${path}`, requestBody, {
            headers,
        });
        return response.data;
    }
    catch (err) {
        if (err instanceof axios_1.AxiosError) {
            console.error('Axios error data: ', err.response?.data);
        }
        else {
            console.error('An error occurred: ', err);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVjdG9yU2VhcmNoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGFtYmRhL3V0aWwvdmVjdG9yU2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFjQSxvQ0FXQztBQUVELGtDQUVDO0FBRUQsOEJBbUJDO0FBRUQsOENBZUM7QUFFRCxnQ0EyQ0M7QUFoSEQsNEVBQTJGO0FBQzNGLDBEQUFxRDtBQUNyRCx3REFBb0Q7QUFDcEQsZ0ZBQW9FO0FBQ3BFLHFEQUErQztBQUMvQywrQ0FBMEM7QUFFMUMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFXLENBQUM7QUFDdkMsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFvQixDQUFDO0FBQzVELE1BQU0sZ0JBQWdCLEdBQUcsOEJBQThCLENBQUM7QUFDeEQsTUFBTSxtQkFBbUIsR0FBRyxJQUFBLDBDQUFlLEdBQUUsQ0FBQztBQUU5QyxNQUFNLE9BQU8sR0FBRyxJQUFJLDZDQUFvQixDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUU5QyxLQUFLLFVBQVUsWUFBWSxDQUFDLElBQVk7SUFDN0MsTUFBTSxPQUFPLEdBQUcsSUFBSSwyQ0FBa0IsQ0FBQztRQUNyQyxPQUFPLEVBQUUsZ0JBQWdCO1FBQ3pCLFdBQVcsRUFBRSxrQkFBa0I7UUFDL0IsTUFBTSxFQUFFLGtCQUFrQjtRQUMxQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQztLQUMxQyxDQUFDLENBQUM7SUFFSCxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDN0MsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFB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Q0FBQyxDQUFDO1FBQzFELENBQUM7YUFBTSxDQUFDO1lBQ04sT0FBTyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM1QyxDQUFDO0lBQ0gsQ0FBQztBQUVQLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCZWRyb2NrUnVudGltZUNsaWVudCwgSW52b2tlTW9kZWxDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWJlZHJvY2stcnVudGltZSc7XG5pbXBvcnQgeyBIdHRwUmVxdWVzdCB9IGZyb20gJ0Bhd3Mtc2RrL3Byb3RvY29sLWh0dHAnO1xuaW1wb3J0IHsgU2lnbmF0dXJlVjQgfSBmcm9tICdAYXdzLXNkay9zaWduYXR1cmUtdjQnO1xuaW1wb3J0IHsgZGVmYXVsdFByb3ZpZGVyIH0gZnJvbSAnQGF3cy1zZGsvY3JlZGVudGlhbC1wcm92aWRlci1ub2RlJztcbmltcG9ydCB7IFNoYTI1NiB9IGZyb20gJ0Bhd3MtY3J5cHRvL3NoYTI1Ni1qcyc7XG5pbXBvcnQgYXhpb3MsIHsgQXhpb3NFcnJvciB9IGZyb20gJ2F4aW9zJztcblxuY29uc3QgcmVnaW9uID0gcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiE7XG5jb25zdCBjb2xsZWN0aW9uRW5kcG9pbnQgPSBwcm9jZXNzLmVudi5PUEVOU0VBUkNIX0VORFBPSU5UITtcbmNvbnN0IGVtYmVkZGluZ01vZGVsSWQgPSAnYW1hem9uLnRpdGFuLWVtYmVkLXRleHQtdjI6MCc7XG5jb25zdCBjcmVkZW50aWFsc1Byb3ZpZGVyID0gZGVmYXVsdFByb3ZpZGVyKCk7XG5cbmNvbnN0IGJlZHJvY2sgPSBuZXcgQmVkcm9ja1J1bnRpbWVDbGllbnQoeyByZWdpb24gfSk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRFbWJlZGRpbmcodGV4dDogc3RyaW5nKTogUHJvbWlzZTxudW1iZXJbXT4ge1xuICBjb25zdCBjb21tYW5kID0gbmV3IEludm9rZU1vZGVsQ29tbWFuZCh7XG4gICAgbW9kZWxJZDogZW1iZWRkaW5nTW9kZWxJZCxcbiAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgIGFjY2VwdDogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgaW5wdXRUZXh0OiB0ZXh0IH0pLFxuICB9KTtcblxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGJlZHJvY2suc2VuZChjb21tYW5kKTtcbiAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UobmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKHJlc3BvbnNlLmJvZHkpKTtcbiAgcmV0dXJuIGJvZHkuZW1iZWRkaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5kZXhWZWN0b3IoaW5kZXg6IHN0cmluZywgZG9jdW1lbnQ6IG9iamVjdCkge1xuICByZXR1cm4gYXdhaXQgc2lnbmVkUG9zdChgLyR7aW5kZXh9L19kb2NgLCBkb2N1bWVudCk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZWFyY2hLTk4oXG4gICAgaW5kZXg6IHN0cmluZyxcbiAgICBlbWJlZGRpbmc6IG51bWJlcltdLFxuICAgIGsgPSAzXG4pOiBQcm9taXNlPHsgX3Njb3JlOiBudW1iZXI7IF9zb3VyY2U6IGFueSB9W10+IHtcbiAgICBjb25zdCBib2R5ID0ge1xuICAgICAgICBzaXplOiBrLFxuICAgICAgICBxdWVyeToge1xuICAgICAgICAgICAga25uOiB7XG4gICAgICAgICAgICAgICAgZW1iZWRkaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIHZlY3RvcjogZW1iZWRkaW5nLFxuICAgICAgICAgICAgICAgICAgICBrLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgIH07XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHNpZ25lZFBvc3QoYC8ke2luZGV4fS9fc2VhcmNoYCwgYm9keSk7XG4gICAgcmV0dXJuIHJlc3BvbnNlPy5oaXRzPy5oaXRzID8/IFtdO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlVmVjdG9ySW5kZXgoaW5kZXg6IHN0cmluZywgZGltZW5zaW9uOiBudW1iZXIpIHtcbiAgcmV0dXJuIGF3YWl0IHNpZ25lZFBvc3QoYC8ke2luZGV4fWAsIHtcbiAgICBzZXR0aW5nczoge1xuICAgICAgaW5kZXg6IHsga25uOiB0cnVlIH0sXG4gICAgfSxcbiAgICBtYXBwaW5nczoge1xuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICB0ZXh0OiB7IHR5cGU6ICd0ZXh0JyB9LFxuICAgICAgICBlbWJlZGRpbmc6IHtcbiAgICAgICAgICB0eXBlOiAna25uX3ZlY3RvcicsXG4gICAgICAgICAgZGltZW5zaW9uLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNpZ25lZFBvc3QocGF0aDogc3RyaW5nLCBib2R5OiBvYmplY3QpIHtcbiAgICB0cnkge1xuICAgICAgICBjb25zdCBjcmVkZW50aWFscyA9IGF3YWl0IGNyZWRlbnRpYWxzUHJvdmlkZXIoKTtcbiAgICAgICAgY29uc3Qgc2lnbmVyID0gbmV3IFNpZ25hdHVyZVY0KHtcbiAgICAgICAgICAgIGNyZWRlbnRpYWxzLFxuICAgICAgICAgICAgcmVnaW9uLFxuICAgICAgICAgICAgc2VydmljZTogJ2Fvc3MnLFxuICAgICAgICAgICAgc2hhMjU2OiBTaGEyNTYsXG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICBjb25zdCByZXF1ZXN0Qm9keSA9IEpTT04uc3RyaW5naWZ5KGJvZHkpO1xuICAgIFxuICAgICAgICBjb25zdCBob3N0bmFtZSA9IG5ldyBVUkwoY29sbGVjdGlvbkVuZHBvaW50KS5ob3N0bmFtZTtcbiAgICBcbiAgICAgICAgY29uc3QgcmVxdWVzdCA9IG5ldyBIdHRwUmVxdWVzdCh7XG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIHByb3RvY29sOiAnaHR0cHM6JyxcbiAgICAgICAgICAgIGhvc3RuYW1lLFxuICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICBob3N0OiBob3N0bmFtZSxcbiAgICAgICAgICAgICAgICAnY29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgICAgICdjb250ZW50LWxlbmd0aCc6IEJ1ZmZlci5ieXRlTGVuZ3RoKHJlcXVlc3RCb2R5KS50b1N0cmluZygpLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGJvZHk6IHJlcXVlc3RCb2R5LFxuICAgICAgICAgfSk7XG4gICAgXG4gICAgICAgIGNvbnN0IHNpZ25lZFJlcXVlc3QgPSBhd2FpdCBzaWduZXIuc2lnbihyZXF1ZXN0KTtcbiAgICAgICAgY29uc3QgaGVhZGVycyA9IHNpZ25lZFJlcXVlc3QuaGVhZGVycztcbiAgICBcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvcy5wb3N0KGAke2NvbGxlY3Rpb25FbmRwb2ludH0ke3BhdGh9YCwgcmVxdWVzdEJvZHksIHtcbiAgICAgICAgICAgIGhlYWRlcnMsXG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIEF4aW9zRXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdBeGlvcyBlcnJvciBkYXRhOiAnLCBlcnIucmVzcG9uc2U/LmRhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FuIGVycm9yIG9jY3VycmVkOiAnLCBlcnIpO1xuICAgICAgICB9XG4gICAgICB9XG5cbn1cbiJdfQ==