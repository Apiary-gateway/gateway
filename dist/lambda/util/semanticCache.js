"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmbedding = getEmbedding;
exports.checkSemanticCache = checkSemanticCache;
exports.addToSemanticCache = addToSemanticCache;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const axios_1 = require("axios");
const protocol_http_1 = require("@aws-sdk/protocol-http");
const signature_v4_1 = require("@aws-sdk/signature-v4");
const credential_provider_node_1 = require("@aws-sdk/credential-provider-node");
const sha256_js_1 = require("@aws-crypto/sha256-js");
// TODO
// Check supported Bedrock regions and validate regional support in CDK stack
// test different embedding sizes? 1024, 512, and 256 options for Titan v2
// if embedding request fails, just move on - right? 
// include cache hit or miss header in response from `router`
// format cached response better - ex. tokens used = 0
const region = process.env.AWS_REGION;
const collectionEndpoint = process.env.OPENSEARCH_ENDPOINT;
const indexName = process.env.OPENSEARCH_INDEX;
const credentialsProvider = (0, credential_provider_node_1.defaultProvider)();
const embeddingModelId = 'amazon.titan-embed-text-v2:0';
const similarityThreshold = 0.85;
const bedrock = new client_bedrock_runtime_1.BedrockRuntimeClient({
    // should specify the region where the Lambda is running
    region,
});
async function getEmbedding(prompt) {
    const command = new client_bedrock_runtime_1.InvokeModelCommand({
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
async function checkSemanticCache(requestEmbedding, userId, provider, model) {
    [userId, provider, model] = getFilters(userId, provider, model);
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
                    { term: { userId: { value: userId } } },
                    { term: { provider: { value: provider } } },
                    { term: { model: { value: model } } },
                ]
            }
        }
    };
    const response = await signedPost(`/${indexName}/_search`, knnQuery);
    const topHit = response.hits?.hits?.[0];
    const similarityScore = topHit?._score;
    return similarityScore && similarityScore >= similarityThreshold ?
        topHit._source.llmResponse : null;
}
async function addToSemanticCache(embedding, prompt, llmResponse, userId, provider, model) {
    try {
        [userId, provider, model] = getFilters(userId, provider, model);
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
    }
    catch (err) {
        if (err instanceof axios_1.AxiosError) {
            console.log('Axios error in addToSemanticCache: ', err.response?.data);
        }
        else {
            console.log('error in addToSemanticCache: ', err);
        }
    }
}
function getFilters(userId, provider, model) {
    userId = userId ? userId : 'global';
    provider = provider ? provider : '';
    model = model ? model : '';
    return [userId, provider, model];
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
        const request = new protocol_http_1.HttpRequest({
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
        const response = await axios_1.default.post(`${collectionEndpoint}${path}`, requestBody, {
            headers: signedHeaders,
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
async function signedGet(path) {
    try {
        const credentials = await credentialsProvider();
        const signer = new signature_v4_1.SignatureV4({
            credentials,
            region,
            service: 'aoss',
            sha256: sha256_js_1.Sha256,
        });
        const request = new protocol_http_1.HttpRequest({
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
        const response = await axios_1.default.get(`${collectionEndpoint}${path}`, {
            headers: signedHeaders,
        });
        return response.data;
    }
    catch (err) {
        if (err instanceof axios_1.AxiosError) {
            console.log('Axios error data: ', err.response?.data);
        }
        else {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VtYW50aWNDYWNoZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xhbWJkYS91dGlsL3NlbWFudGljQ2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUEwQkEsb0NBWUM7QUFFRCxnREFxQ0M7QUFFRCxnREE2QkM7QUE1R0QsNEVBQTJGO0FBQzNGLGlDQUEwQztBQUUxQywwREFBcUQ7QUFDckQsd0RBQW9EO0FBQ3BELGdGQUFvRTtBQUNwRSxxREFBK0M7QUFFL0MsT0FBTztBQUNQLDZFQUE2RTtBQUM3RSwwRUFBMEU7QUFDMUUscURBQXFEO0FBQ3JELDZEQUE2RDtBQUM3RCxzREFBc0Q7QUFFdEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFXLENBQUM7QUFDdkMsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFvQixDQUFDO0FBQzVELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUM7QUFDL0MsTUFBTSxtQkFBbUIsR0FBRyxJQUFBLDBDQUFlLEdBQUUsQ0FBQztBQUM5QyxNQUFNLGdCQUFnQixHQUFHLDhCQUE4QixDQUFDO0FBQ3hELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDO0FBQ2pDLE1BQU0sT0FBTyxHQUFHLElBQUksNkNBQW9CLENBQUM7SUFDdkMsd0RBQXdEO0lBQ3hELE1BQU07Q0FDUCxDQUFDLENBQUM7QUFFSSxLQUFLLFVBQVUsWUFBWSxDQUFDLE1BQWM7SUFDL0MsTUFBTSxPQUFPLEdBQUcsSUFBSSwyQ0FBa0IsQ0FBQztRQUNyQyxPQUFPLEVBQUUsZ0JBQWdCO1FBQ3pCLFdBQVcsRUFBRSxrQkFBa0I7UUFDL0IsTUFBTSxFQUFFLGtCQUFrQjtRQUMxQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUMzQyx5Q0FBeUM7S0FDMUMsQ0FBQyxDQUFD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QUM7UUFFSCxNQUFNLGFBQWEsR0FBRyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFakQsTUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQztRQUU1QyxNQUFNLFFBQVEsR0FBRyxNQUFNLGVBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxrQkFBa0IsR0FBRyxJQUFJLEVBQUUsRUFBRTtZQUMvRCxPQUFPLEVBQUUsYUFBYTtTQUN2QixDQUFDLENBQUM7UUFFSCxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUM7SUFDdkIsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDYixJQUFJLEdBQUcsWUFBWSxrQkFBVSxFQUFFLENBQUM7WUFDOUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hELENBQUM7YUFBTSxDQUFDO1lBQ04sT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMxQyxDQUFDO0lBQ0gsQ0FBQztBQUNILENBQUM7QUFFRDs7Ozs7RUFLRSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEJlZHJvY2tSdW50aW1lQ2xpZW50LCBJbnZva2VNb2RlbENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtYmVkcm9jay1ydW50aW1lJztcbmltcG9ydCBheGlvcywgeyBBeGlvc0Vycm9yIH0gZnJvbSAnYXhpb3MnO1xuaW1wb3J0IHsgQ29tcGxldGlvblJlc3BvbnNlIH0gZnJvbSAndG9rZW4uanMnO1xuaW1wb3J0IHsgSHR0cFJlcXVlc3QgfSBmcm9tICdAYXdzLXNkay9wcm90b2NvbC1odHRwJztcbmltcG9ydCB7IFNpZ25hdHVyZVY0IH0gZnJvbSAnQGF3cy1zZGsvc2lnbmF0dXJlLXY0JztcbmltcG9ydCB7IGRlZmF1bHRQcm92aWRlciB9IGZyb20gJ0Bhd3Mtc2RrL2NyZWRlbnRpYWwtcHJvdmlkZXItbm9kZSc7XG5pbXBvcnQgeyBTaGEyNTYgfSBmcm9tICdAYXdzLWNyeXB0by9zaGEyNTYtanMnO1xuXG4vLyBUT0RPXG4vLyBDaGVjayBzdXBwb3J0ZWQgQmVkcm9jayByZWdpb25zIGFuZCB2YWxpZGF0ZSByZWdpb25hbCBzdXBwb3J0IGluIENESyBzdGFja1xuLy8gdGVzdCBkaWZmZXJlbnQgZW1iZWRkaW5nIHNpemVzPyAxMDI0LCA1MTIsIGFuZCAyNTYgb3B0aW9ucyBmb3IgVGl0YW4gdjJcbi8vIGlmIGVtYmVkZGluZyByZXF1ZXN0IGZhaWxzLCBqdXN0IG1vdmUgb24gLSByaWdodD8gXG4vLyBpbmNsdWRlIGNhY2hlIGhpdCBvciBtaXNzIGhlYWRlciBpbiByZXNwb25zZSBmcm9tIGByb3V0ZXJgXG4vLyBmb3JtYXQgY2FjaGVkIHJlc3BvbnNlIGJldHRlciAtIGV4LiB0b2tlbnMgdXNlZCA9IDBcblxuY29uc3QgcmVnaW9uID0gcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiE7XG5jb25zdCBjb2xsZWN0aW9uRW5kcG9pbnQgPSBwcm9jZXNzLmVudi5PUEVOU0VBUkNIX0VORFBPSU5UITtcbmNvbnN0IGluZGV4TmFtZSA9IHByb2Nlc3MuZW52Lk9QRU5TRUFSQ0hfSU5ERVg7XG5jb25zdCBjcmVkZW50aWFsc1Byb3ZpZGVyID0gZGVmYXVsdFByb3ZpZGVyKCk7XG5jb25zdCBlbWJlZGRpbmdNb2RlbElkID0gJ2FtYXpvbi50aXRhbi1lbWJlZC10ZXh0LXYyOjAnO1xuY29uc3Qgc2ltaWxhcml0eVRocmVzaG9sZCA9IDAuODU7XG5jb25zdCBiZWRyb2NrID0gbmV3IEJlZHJvY2tSdW50aW1lQ2xpZW50KHtcbiAgLy8gc2hvdWxkIHNwZWNpZnkgdGhlIHJlZ2lvbiB3aGVyZSB0aGUgTGFtYmRhIGlzIHJ1bm5pbmdcbiAgcmVnaW9uLFxufSk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRFbWJlZGRpbmcocHJvbXB0OiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcltdPiB7XG4gIGNvbnN0IGNvbW1hbmQgPSBuZXcgSW52b2tlTW9kZWxDb21tYW5kKHtcbiAgICBtb2RlbElkOiBlbWJlZGRpbmdNb2RlbElkLFxuICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgYWNjZXB0OiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBpbnB1dFRleHQ6IHByb21wdCB9KSxcbiAgICAvLyBwZXJmb3JtYW5jZUNvbmZpZ0xhdGVuY3k6ICdvcHRpbWl6ZWQnLFxuICB9KTtcblxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGJlZHJvY2suc2VuZChjb21tYW5kKTtcbiAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UobmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKHJlc3BvbnNlLmJvZHkpKTtcbiAgcmV0dXJuIGJvZHkuZW1iZWRkaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tTZW1hbnRpY0NhY2hlKFxuICByZXF1ZXN0RW1iZWRkaW5nOiBudW1iZXJbXSxcbiAgdXNlcklkPzogc3RyaW5nLFxuICBwcm92aWRlcj86IHN0cmluZyxcbiAgbW9kZWw/OiBzdHJpbmdcbikgeyBcbiAgWyB1c2VySWQsIHByb3ZpZGVyLCBtb2RlbCBdID0gZ2V0RmlsdGVycyh1c2VySWQsIHByb3ZpZGVyLCBtb2RlbCk7XG5cbiAgLy8gS05OIGlzIEstbmVhcmVzdCBuZWlnaGJvcnMsIHdoZXJlIEsgaXMgbnVtYmVyIG9mIG5lYXJlc3QgbmVpZ2hib3JzIHRvIGdldCAgXG4gIGNvbnN0IGtublF1ZXJ5ID0ge1xuICAgIHNpemU6IDEsXG4gICAgcXVlcnk6IHtcbiAgICAgIGtubjoge1xuICAgICAgICBlbWJlZGRpbmc6IHtcbiAgICAgICAgICB2ZWN0b3I6IHJlcXVlc3RFbWJlZGRpbmcsXG4gICAgICAgICAgazogMVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBwb3N0X2ZpbHRlcjoge1xuICAgICAgYm9vbDoge1xuICAgICAgICBtdXN0OiBbXG4gICAgICAgICAgeyB0ZXJtOiB7IHVzZXJJZDoge3ZhbHVlOiB1c2VySWR9IH0gfSxcbiAgICAgICAgICB7IHRlcm06IHsgcHJvdmlkZXI6IHt2YWx1ZTogcHJvdmlkZXJ9IH0gfSxcbiAgICAgICAgICB7IHRlcm06IHsgbW9kZWw6IHt2YWx1ZTogbW9kZWx9IH0gfSxcbiAgICAgICAgXVxuICAgICAgfSAgXG4gICAgfVxuICB9XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzaWduZWRQb3N0KGAvJHtpbmRleE5hbWV9L19zZWFyY2hgLCBrbm5RdWVyeSk7XG5cbiAgY29uc3QgdG9wSGl0ID0gcmVzcG9uc2UuaGl0cz8uaGl0cz8uWzBdO1xuICBjb25zdCBzaW1pbGFyaXR5U2NvcmUgPSB0b3BIaXQ/Ll9zY29yZTtcblxuICByZXR1cm4gc2ltaWxhcml0eVNjb3JlICYmIHNpbWlsYXJpdHlTY29yZSA+PSBzaW1pbGFyaXR5VGhyZXNob2xkID9cbiAgICB0b3BIaXQuX3NvdXJjZS5sbG1SZXNwb25zZSA6IG51bGw7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRUb1NlbWFudGljQ2FjaGUoXG4gIGVtYmVkZGluZzogbnVtYmVyW10sXG4gIHByb21wdDogc3RyaW5nLCBcbiAgbGxtUmVzcG9uc2U6IHN0cmluZyxcbiAgdXNlcklkPzogc3RyaW5nLFxuICBwcm92aWRlcj86IHN0cmluZyxcbiAgbW9kZWw/OiBzdHJpbmdcbikge1xuICB0cnkge1xuICAgIFsgdXNlcklkLCBwcm92aWRlciwgbW9kZWwgXSA9IGdldEZpbHRlcnModXNlcklkLCBwcm92aWRlciwgbW9kZWwpO1xuICAgIFxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgc2lnbmVkUG9zdChgLyR7aW5kZXhOYW1lfS9fZG9jYCwge1xuICAgICAgdXNlcklkLFxuICAgICAgcHJvdmlkZXIsXG4gICAgICBtb2RlbCxcbiAgICAgIGVtYmVkZGluZyxcbiAgICAgIHJlcXVlc3RUZXh0OiBwcm9tcHQsXG4gICAgICBsbG1SZXNwb25zZSxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgfSk7XG5cbiAgICAvLyBjb25zb2xlLmxvZygnc3VjY2Vzc2Z1bGx5IGFkZGVkIHRvIHNlbWFudGljIGNhY2hlOiAnLCBKU09OLnN0cmluZ2lmeShyZXNwb25zZSkpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoZXJyIGluc3RhbmNlb2YgQXhpb3NFcnJvcikge1xuICAgICAgY29uc29sZS5sb2coJ0F4aW9zIGVycm9yIGluIGFkZFRvU2VtYW50aWNDYWNoZTogJywgZXJyLnJlc3BvbnNlPy5kYXRhKTtcbiAgICB9IGVsc2V7XG4gICAgICBjb25zb2xlLmxvZygnZXJyb3IgaW4gYWRkVG9TZW1hbnRpY0NhY2hlOiAnLCBlcnIpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRGaWx0ZXJzKCAgXG4gIHVzZXJJZD86IHN0cmluZyxcbiAgcHJvdmlkZXI/OiBzdHJpbmcsXG4gIG1vZGVsPzogc3RyaW5nXG4pIHtcbiAgdXNlcklkID0gdXNlcklkID8gdXNlcklkIDogJ2dsb2JhbCc7XG4gIHByb3ZpZGVyID0gcHJvdmlkZXIgPyBwcm92aWRlciA6ICcnO1xuICBtb2RlbCA9IG1vZGVsID8gbW9kZWwgOiAnJztcblxuICByZXR1cm4gW3VzZXJJZCwgcHJvdmlkZXIsIG1vZGVsXTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc2lnbmVkUG9zdChwYXRoOiBzdHJpbmcsIGJvZHk6IG9iamVjdCkge1xuICB0cnkge1xuICAgIGNvbnN0IGNyZWRlbnRpYWxzID0gYXdhaXQgY3JlZGVudGlhbHNQcm92aWRlcigpO1xuXG4gICAgY29uc3Qgc2lnbmVyID0gbmV3IFNpZ25hdHVyZVY0KHtcbiAgICAgIGNyZWRlbnRpYWxzLFxuICAgICAgcmVnaW9uLFxuICAgICAgc2VydmljZTogJ2Fvc3MnLFxuICAgICAgc2hhMjU2OiBTaGEyNTYsXG4gICAgfSk7XG5cbiAgICBjb25zdCByZXF1ZXN0Qm9keSA9IEpTT04uc3RyaW5naWZ5KGJvZHkpO1xuXG4gICAgY29uc3QgcmVxdWVzdCA9IG5ldyBIdHRwUmVxdWVzdCh7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIHByb3RvY29sOiAnaHR0cHM6JyxcbiAgICAgIGhvc3RuYW1lOiBuZXcgVVJMKGNvbGxlY3Rpb25FbmRwb2ludCkuaG9zdG5hbWUsXG4gICAgICBwYXRoLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnaG9zdCc6IG5ldyBVUkwoY29sbGVjdGlvbkVuZHBvaW50KS5ob3N0bmFtZSxcbiAgICAgICAgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ2NvbnRlbnQtbGVuZ3RoJzogQnVmZmVyLmJ5dGVMZW5ndGgocmVxdWVzdEJvZHkpLnRvU3RyaW5nKCksXG4gICAgICB9LFxuICAgICAgYm9keTogcmVxdWVzdEJvZHksXG4gICAgfSk7XG5cbiAgICBjb25zdCBzaWduZWRSZXF1ZXN0ID0gYXdhaXQgc2lnbmVyLnNpZ24ocmVxdWVzdCk7XG5cbiAgICBjb25zdCBzaWduZWRIZWFkZXJzID0gc2lnbmVkUmVxdWVzdC5oZWFkZXJzO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvcy5wb3N0KGAke2NvbGxlY3Rpb25FbmRwb2ludH0ke3BhdGh9YCwgcmVxdWVzdEJvZHksIHtcbiAgICAgIGhlYWRlcnM6IHNpZ25lZEhlYWRlcnMsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKGVyciBpbnN0YW5jZW9mIEF4aW9zRXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0F4aW9zIGVycm9yIGRhdGE6ICcsIGVyci5yZXNwb25zZT8uZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0FuIGVycm9yIG9jY3VycmVkOiAnLCBlcnIpO1xuICAgIH1cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBzaWduZWRHZXQocGF0aDogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgY3JlZGVudGlhbHMgPSBhd2FpdCBjcmVkZW50aWFsc1Byb3ZpZGVyKCk7XG4gIFxuICAgIGNvbnN0IHNpZ25lciA9IG5ldyBTaWduYXR1cmVWNCh7XG4gICAgICBjcmVkZW50aWFscyxcbiAgICAgIHJlZ2lvbixcbiAgICAgIHNlcnZpY2U6ICdhb3NzJyxcbiAgICAgIHNoYTI1NjogU2hhMjU2LFxuICAgIH0pO1xuICBcbiAgICBjb25zdCByZXF1ZXN0ID0gbmV3IEh0dHBSZXF1ZXN0KHtcbiAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICBwcm90b2NvbDogJ2h0dHBzOicsXG4gICAgICBob3N0bmFtZTogbmV3IFVSTChjb2xsZWN0aW9uRW5kcG9pbnQpLmhvc3RuYW1lLFxuICAgICAgcGF0aCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgaG9zdDogbmV3IFVSTChjb2xsZWN0aW9uRW5kcG9pbnQpLmhvc3RuYW1lLFxuICAgICAgfSxcbiAgICB9KTtcbiAgXG4gICAgY29uc3Qgc2lnbmVkUmVxdWVzdCA9IGF3YWl0IHNpZ25lci5zaWduKHJlcXVlc3QpO1xuXG4gICAgY29uc3Qgc2lnbmVkSGVhZGVycyA9IHNpZ25lZFJlcXVlc3QuaGVhZGVycztcbiAgXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvcy5nZXQoYCR7Y29sbGVjdGlvbkVuZHBvaW50fSR7cGF0aH1gLCB7XG4gICAgICBoZWFkZXJzOiBzaWduZWRIZWFkZXJzLFxuICAgIH0pO1xuICBcbiAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKGVyciBpbnN0YW5jZW9mIEF4aW9zRXJyb3IpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdBeGlvcyBlcnJvciBkYXRhOiAnLCBlcnIucmVzcG9uc2U/LmRhdGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZygnQW4gZXJyb3Igb2NjdXJyZWQ6ICcsIGVycik7XG4gICAgfVxuICB9XG59XG5cbi8qXG5Lbm93biB3b3JraW5nIE9TUyBlbmRwb2ludHM6XG4gICogJy9zZW1hbnRpYy1jYWNoZS1pbmRleCcgKEdFVCByZXF1ZXN0IHJldHVybnMgaW5kZXggc2NoZW1hKVxuICAqICcvc2VtYW50aWMtY2FjaGUtaW5kZXgvX3NlYXJjaCdcbiAgKiBcbiovXG4iXX0=