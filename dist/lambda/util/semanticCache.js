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
const client_scheduler_1 = require("@aws-sdk/client-scheduler");
const uuid_1 = require("uuid");
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
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
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
        await scheduleDelete(response._id);
        console.log('successfully added to semantic cache: ', JSON.stringify(response));
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
async function scheduleDelete(documentId) {
    console.log(`scheduling delete for document: ${documentId}`);
    const scheduler = new client_scheduler_1.SchedulerClient({});
    let runAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
    const runAtFormatMatch = runAt.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    if (runAtFormatMatch) {
        runAt = runAtFormatMatch[0];
    }
    ;
    const command = new client_scheduler_1.CreateScheduleCommand({
        Name: `delete-doc-${(0, uuid_1.v4)()}`,
        ScheduleExpression: `at(${runAt})`,
        FlexibleTimeWindow: { Mode: "OFF" },
        Target: {
            Arn: process.env.DELETE_DOCUMENT_LAMBDA_ARN,
            RoleArn: process.env.SCHEDULER_ROLE_ARN,
            Input: JSON.stringify({ documentId }),
        },
    });
    const response = await scheduler.send(command);
    console.log(`Document scheduled for deletion. Scheduler response: ${JSON.stringify(response)}`);
    return {
        message: `Document scheduled for deletion. Scheduler response: ${JSON.stringify(response)}`,
    };
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
            console.error('Response status code: ', err.response?.status, 'Axios error data: ', err.response?.data);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VtYW50aWNDYWNoZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xhbWJkYS91dGlsL3NlbWFudGljQ2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUE2QkEsb0NBWUM7QUFFRCxnREFxQ0M7QUFFRCxnREErQkM7QUFqSEQsNEVBQTJGO0FBQzNGLGlDQUEwQztBQUUxQywwREFBcUQ7QUFDckQsd0RBQW9EO0FBQ3BELGdGQUFvRTtBQUNwRSxxREFBK0M7QUFDL0MsZ0VBQW1GO0FBQ25GLCtCQUFvQztBQUVwQyxPQUFPO0FBQ1AsNkVBQTZFO0FBQzdFLDBFQUEwRTtBQUMxRSxxREFBcUQ7QUFDckQsNkRBQTZEO0FBQzdELHNEQUFzRDtBQUV0RCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVcsQ0FBQztBQUN2QyxNQUFNLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW9CLENBQUM7QUFDNUQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQztBQUMvQyxNQUFNLG1CQUFtQixHQUFHLElBQUEsMENBQWUsR0FBRSxDQUFDO0FBQzlDLE1BQU0sZ0JBQWdCLEdBQUcsOEJBQThCLENBQUM7QUFDeEQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUM7QUFDakMsTUFBTSxPQUFPLEdBQUcsSUFBSSw2Q0FBb0IsQ0FBQztJQUN2Qyx3REFBd0Q7SUFDeEQsTUFBTTtDQUNQLENBQUMsQ0FBQztBQUNILE1BQU0sWUFBWSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsWUFBWTtBQUV6QyxLQUFLLFVBQVUsWUFBWSxDQUFDLE1BQWM7SUFDL0MsTUFBTSxPQUFPLEdBQUcsSUFBSSwyQ0FBa0IsQ0FBQztRQUNyQyxPQUFPLEVBQUUsZ0JBQWdCO1FBQ3pCLFdBQVcsRUFBRSxrQkFBa0I7UUFDL0IsTUFBTSxFQUFFLGtCQUFrQjtRQUMxQixJ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T0FBTyxFQUFFLE1BQU07WUFDZixNQUFNLEVBQUUsa0JBQU07U0FDZixDQUFDLENBQUM7UUFFSCxNQUFNLE9BQU8sR0FBRyxJQUFJLDJCQUFXLENBQUM7WUFDOUIsTUFBTSxFQUFFLEtBQUs7WUFDYixRQUFRLEVBQUUsUUFBUTtZQUNsQixRQUFRLEVBQUUsSUFBSSxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxRQUFRO1lBQzlDLElBQUk7WUFDSixPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLElBQUksR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsUUFBUTthQUMzQztTQUNGLENBQUMsQ0FBQztRQUVILE1BQU0sYUFBYSxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVqRCxNQUFNLGFBQWEsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDO1FBRTVDLE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLGtCQUFrQixHQUFHLElBQUksRUFBRSxFQUFFO1lBQy9ELE9BQU8sRUFBRSxhQUFhO1NBQ3ZCLENBQUMsQ0FBQztRQUVILE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQztJQUN2QixDQUFDO0lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNiLElBQUksR0FBRyxZQUFZLGtCQUFVLEVBQUUsQ0FBQztZQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDeEQsQ0FBQzthQUFNLENBQUM7WUFDTixPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzFDLENBQUM7SUFDSCxDQUFDO0FBQ0gsQ0FBQztBQUVEOzs7OztFQUtFIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQmVkcm9ja1J1bnRpbWVDbGllbnQsIEludm9rZU1vZGVsQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1iZWRyb2NrLXJ1bnRpbWUnO1xuaW1wb3J0IGF4aW9zLCB7IEF4aW9zRXJyb3IgfSBmcm9tICdheGlvcyc7XG5pbXBvcnQgeyBDb21wbGV0aW9uUmVzcG9uc2UgfSBmcm9tICd0b2tlbi5qcyc7XG5pbXBvcnQgeyBIdHRwUmVxdWVzdCB9IGZyb20gJ0Bhd3Mtc2RrL3Byb3RvY29sLWh0dHAnO1xuaW1wb3J0IHsgU2lnbmF0dXJlVjQgfSBmcm9tICdAYXdzLXNkay9zaWduYXR1cmUtdjQnO1xuaW1wb3J0IHsgZGVmYXVsdFByb3ZpZGVyIH0gZnJvbSAnQGF3cy1zZGsvY3JlZGVudGlhbC1wcm92aWRlci1ub2RlJztcbmltcG9ydCB7IFNoYTI1NiB9IGZyb20gJ0Bhd3MtY3J5cHRvL3NoYTI1Ni1qcyc7XG5pbXBvcnQgeyBTY2hlZHVsZXJDbGllbnQsIENyZWF0ZVNjaGVkdWxlQ29tbWFuZCB9IGZyb20gXCJAYXdzLXNkay9jbGllbnQtc2NoZWR1bGVyXCI7XG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tIFwidXVpZFwiO1xuXG4vLyBUT0RPXG4vLyBDaGVjayBzdXBwb3J0ZWQgQmVkcm9jayByZWdpb25zIGFuZCB2YWxpZGF0ZSByZWdpb25hbCBzdXBwb3J0IGluIENESyBzdGFja1xuLy8gdGVzdCBkaWZmZXJlbnQgZW1iZWRkaW5nIHNpemVzPyAxMDI0LCA1MTIsIGFuZCAyNTYgb3B0aW9ucyBmb3IgVGl0YW4gdjJcbi8vIGlmIGVtYmVkZGluZyByZXF1ZXN0IGZhaWxzLCBqdXN0IG1vdmUgb24gLSByaWdodD8gXG4vLyBpbmNsdWRlIGNhY2hlIGhpdCBvciBtaXNzIGhlYWRlciBpbiByZXNwb25zZSBmcm9tIGByb3V0ZXJgXG4vLyBmb3JtYXQgY2FjaGVkIHJlc3BvbnNlIGJldHRlciAtIGV4LiB0b2tlbnMgdXNlZCA9IDBcblxuY29uc3QgcmVnaW9uID0gcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiE7XG5jb25zdCBjb2xsZWN0aW9uRW5kcG9pbnQgPSBwcm9jZXNzLmVudi5PUEVOU0VBUkNIX0VORFBPSU5UITtcbmNvbnN0IGluZGV4TmFtZSA9IHByb2Nlc3MuZW52Lk9QRU5TRUFSQ0hfSU5ERVg7XG5jb25zdCBjcmVkZW50aWFsc1Byb3ZpZGVyID0gZGVmYXVsdFByb3ZpZGVyKCk7XG5jb25zdCBlbWJlZGRpbmdNb2RlbElkID0gJ2FtYXpvbi50aXRhbi1lbWJlZC10ZXh0LXYyOjAnO1xuY29uc3Qgc2ltaWxhcml0eVRocmVzaG9sZCA9IDAuODU7XG5jb25zdCBiZWRyb2NrID0gbmV3IEJlZHJvY2tSdW50aW1lQ2xpZW50KHtcbiAgLy8gc2hvdWxkIHNwZWNpZnkgdGhlIHJlZ2lvbiB3aGVyZSB0aGUgTGFtYmRhIGlzIHJ1bm5pbmdcbiAgcmVnaW9uLFxufSk7XG5jb25zdCBDQUNIRV9UVExfTVMgPSA1ICogNjAgKiAxMDAwOyAvLyA1IG1pbnV0ZXNcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEVtYmVkZGluZyhwcm9tcHQ6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyW10+IHtcbiAgY29uc3QgY29tbWFuZCA9IG5ldyBJbnZva2VNb2RlbENvbW1hbmQoe1xuICAgIG1vZGVsSWQ6IGVtYmVkZGluZ01vZGVsSWQsXG4gICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICBhY2NlcHQ6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGlucHV0VGV4dDogcHJvbXB0IH0pLFxuICAgIC8vIHBlcmZvcm1hbmNlQ29uZmlnTGF0ZW5jeTogJ29wdGltaXplZCcsXG4gIH0pO1xuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYmVkcm9jay5zZW5kKGNvbW1hbmQpO1xuICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUocmVzcG9uc2UuYm9keSkpO1xuICByZXR1cm4gYm9keS5lbWJlZGRpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja1NlbWFudGljQ2FjaGUoXG4gIHJlcXVlc3RFbWJlZGRpbmc6IG51bWJlcltdLFxuICB1c2VySWQ/OiBzdHJpbmcsXG4gIHByb3ZpZGVyPzogc3RyaW5nLFxuICBtb2RlbD86IHN0cmluZ1xuKSB7IFxuICBbIHVzZXJJZCwgcHJvdmlkZXIsIG1vZGVsIF0gPSBnZXRGaWx0ZXJzKHVzZXJJZCwgcHJvdmlkZXIsIG1vZGVsKTtcblxuICAvLyBLTk4gaXMgSy1uZWFyZXN0IG5laWdoYm9ycywgd2hlcmUgSyBpcyBudW1iZXIgb2YgbmVhcmVzdCBuZWlnaGJvcnMgdG8gZ2V0ICBcbiAgY29uc3Qga25uUXVlcnkgPSB7XG4gICAgc2l6ZTogMSxcbiAgICBxdWVyeToge1xuICAgICAga25uOiB7XG4gICAgICAgIGVtYmVkZGluZzoge1xuICAgICAgICAgIHZlY3RvcjogcmVxdWVzdEVtYmVkZGluZyxcbiAgICAgICAgICBrOiAxXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIHBvc3RfZmlsdGVyOiB7XG4gICAgICBib29sOiB7XG4gICAgICAgIG11c3Q6IFtcbiAgICAgICAgICB7IHRlcm06IHsgdXNlcklkOiB7dmFsdWU6IHVzZXJJZH0gfSB9LFxuICAgICAgICAgIHsgdGVybTogeyBwcm92aWRlcjoge3ZhbHVlOiBwcm92aWRlcn0gfSB9LFxuICAgICAgICAgIHsgdGVybTogeyBtb2RlbDoge3ZhbHVlOiBtb2RlbH0gfSB9LFxuICAgICAgICBdXG4gICAgICB9ICBcbiAgICB9XG4gIH1cblxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHNpZ25lZFBvc3QoYC8ke2luZGV4TmFtZX0vX3NlYXJjaGAsIGtublF1ZXJ5KTtcblxuICBjb25zdCB0b3BIaXQgPSByZXNwb25zZS5oaXRzPy5oaXRzPy5bMF07XG4gIGNvbnN0IHNpbWlsYXJpdHlTY29yZSA9IHRvcEhpdD8uX3Njb3JlO1xuXG4gIHJldHVybiBzaW1pbGFyaXR5U2NvcmUgJiYgc2ltaWxhcml0eVNjb3JlID49IHNpbWlsYXJpdHlUaHJlc2hvbGQgP1xuICAgIHRvcEhpdC5fc291cmNlLmxsbVJlc3BvbnNlIDogbnVsbDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkZFRvU2VtYW50aWNDYWNoZShcbiAgZW1iZWRkaW5nOiBudW1iZXJbXSxcbiAgcHJvbXB0OiBzdHJpbmcsIFxuICBsbG1SZXNwb25zZTogc3RyaW5nLFxuICB1c2VySWQ/OiBzdHJpbmcsXG4gIHByb3ZpZGVyPzogc3RyaW5nLFxuICBtb2RlbD86IHN0cmluZ1xuKSB7XG4gIHRyeSB7XG4gICAgWyB1c2VySWQsIHByb3ZpZGVyLCBtb2RlbCBdID0gZ2V0RmlsdGVycyh1c2VySWQsIHByb3ZpZGVyLCBtb2RlbCk7XG4gICAgXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzaWduZWRQb3N0KGAvJHtpbmRleE5hbWV9L19kb2NgLCB7XG4gICAgICB1c2VySWQsXG4gICAgICBwcm92aWRlcixcbiAgICAgIG1vZGVsLFxuICAgICAgZW1iZWRkaW5nLFxuICAgICAgcmVxdWVzdFRleHQ6IHByb21wdCxcbiAgICAgIGxsbVJlc3BvbnNlLFxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICB9KTtcblxuICAgIGF3YWl0IHNjaGVkdWxlRGVsZXRlKHJlc3BvbnNlLl9pZCk7XG5cbiAgICBjb25zb2xlLmxvZygnc3VjY2Vzc2Z1bGx5IGFkZGVkIHRvIHNlbWFudGljIGNhY2hlOiAnLCBKU09OLnN0cmluZ2lmeShyZXNwb25zZSkpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoZXJyIGluc3RhbmNlb2YgQXhpb3NFcnJvcikge1xuICAgICAgY29uc29sZS5sb2coJ0F4aW9zIGVycm9yIGluIGFkZFRvU2VtYW50aWNDYWNoZTogJywgZXJyLnJlc3BvbnNlPy5kYXRhKTtcbiAgICB9IGVsc2V7XG4gICAgICBjb25zb2xlLmxvZygnZXJyb3IgaW4gYWRkVG9TZW1hbnRpY0NhY2hlOiAnLCBlcnIpO1xuICAgIH1cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBzY2hlZHVsZURlbGV0ZShkb2N1bWVudElkOiBzdHJpbmcpIHtcbiAgY29uc29sZS5sb2coYHNjaGVkdWxpbmcgZGVsZXRlIGZvciBkb2N1bWVudDogJHtkb2N1bWVudElkfWApO1xuICBcbiAgY29uc3Qgc2NoZWR1bGVyID0gbmV3IFNjaGVkdWxlckNsaWVudCh7fSk7XG5cbiAgbGV0IHJ1bkF0ID0gbmV3IERhdGUoRGF0ZS5ub3coKSArIENBQ0hFX1RUTF9NUykudG9JU09TdHJpbmcoKTtcbiAgY29uc3QgcnVuQXRGb3JtYXRNYXRjaCA9IHJ1bkF0Lm1hdGNoKC9cXGR7NH0tXFxkezJ9LVxcZHsyfVRcXGR7Mn06XFxkezJ9OlxcZHsyfS8pO1xuICBpZiAocnVuQXRGb3JtYXRNYXRjaCkge1xuICAgIHJ1bkF0ID0gcnVuQXRGb3JtYXRNYXRjaFswXTtcbiAgfTtcblxuICBjb25zdCBjb21tYW5kID0gbmV3IENyZWF0ZVNjaGVkdWxlQ29tbWFuZCh7XG4gICAgTmFtZTogYGRlbGV0ZS1kb2MtJHt1dWlkdjQoKX1gLFxuICAgIFNjaGVkdWxlRXhwcmVzc2lvbjogYGF0KCR7cnVuQXR9KWAsXG4gICAgRmxleGlibGVUaW1lV2luZG93OiB7IE1vZGU6IFwiT0ZGXCIgfSxcbiAgICBUYXJnZXQ6IHtcbiAgICAgIEFybjogcHJvY2Vzcy5lbnYuREVMRVRFX0RPQ1VNRU5UX0xBTUJEQV9BUk4sXG4gICAgICBSb2xlQXJuOiBwcm9jZXNzLmVudi5TQ0hFRFVMRVJfUk9MRV9BUk4sXG4gICAgICBJbnB1dDogSlNPTi5zdHJpbmdpZnkoeyBkb2N1bWVudElkIH0pLFxuICAgIH0sXG4gIH0pO1xuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgc2NoZWR1bGVyLnNlbmQoY29tbWFuZCk7XG4gIGNvbnNvbGUubG9nKGBEb2N1bWVudCBzY2hlZHVsZWQgZm9yIGRlbGV0aW9uLiBTY2hlZHVsZXIgcmVzcG9uc2U6ICR7SlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpfWApO1xuICBcbiAgcmV0dXJuIHtcbiAgICBtZXNzYWdlOiBgRG9jdW1lbnQgc2NoZWR1bGVkIGZvciBkZWxldGlvbi4gU2NoZWR1bGVyIHJlc3BvbnNlOiAke0pTT04uc3RyaW5naWZ5KHJlc3BvbnNlKX1gLFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRGaWx0ZXJzKCAgXG4gIHVzZXJJZD86IHN0cmluZyxcbiAgcHJvdmlkZXI/OiBzdHJpbmcsXG4gIG1vZGVsPzogc3RyaW5nXG4pIHtcbiAgdXNlcklkID0gdXNlcklkID8gdXNlcklkIDogJ2dsb2JhbCc7XG4gIHByb3ZpZGVyID0gcHJvdmlkZXIgPyBwcm92aWRlciA6ICcnO1xuICBtb2RlbCA9IG1vZGVsID8gbW9kZWwgOiAnJztcblxuICByZXR1cm4gW3VzZXJJZCwgcHJvdmlkZXIsIG1vZGVsXTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc2lnbmVkUG9zdChwYXRoOiBzdHJpbmcsIGJvZHk6IG9iamVjdCkge1xuICB0cnkge1xuICAgIGNvbnN0IGNyZWRlbnRpYWxzID0gYXdhaXQgY3JlZGVudGlhbHNQcm92aWRlcigpO1xuXG4gICAgY29uc3Qgc2lnbmVyID0gbmV3IFNpZ25hdHVyZVY0KHtcbiAgICAgIGNyZWRlbnRpYWxzLFxuICAgICAgcmVnaW9uLFxuICAgICAgc2VydmljZTogJ2Fvc3MnLFxuICAgICAgc2hhMjU2OiBTaGEyNTYsXG4gICAgfSk7XG5cbiAgICBjb25zdCByZXF1ZXN0Qm9keSA9IEpTT04uc3RyaW5naWZ5KGJvZHkpO1xuXG4gICAgY29uc3QgcmVxdWVzdCA9IG5ldyBIdHRwUmVxdWVzdCh7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIHByb3RvY29sOiAnaHR0cHM6JyxcbiAgICAgIGhvc3RuYW1lOiBuZXcgVVJMKGNvbGxlY3Rpb25FbmRwb2ludCkuaG9zdG5hbWUsXG4gICAgICBwYXRoLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnaG9zdCc6IG5ldyBVUkwoY29sbGVjdGlvbkVuZHBvaW50KS5ob3N0bmFtZSxcbiAgICAgICAgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ2NvbnRlbnQtbGVuZ3RoJzogQnVmZmVyLmJ5dGVMZW5ndGgocmVxdWVzdEJvZHkpLnRvU3RyaW5nKCksXG4gICAgICB9LFxuICAgICAgYm9keTogcmVxdWVzdEJvZHksXG4gICAgfSk7XG5cbiAgICBjb25zdCBzaWduZWRSZXF1ZXN0ID0gYXdhaXQgc2lnbmVyLnNpZ24ocmVxdWVzdCk7XG5cbiAgICBjb25zdCBzaWduZWRIZWFkZXJzID0gc2lnbmVkUmVxdWVzdC5oZWFkZXJzO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvcy5wb3N0KGAke2NvbGxlY3Rpb25FbmRwb2ludH0ke3BhdGh9YCwgcmVxdWVzdEJvZHksIHtcbiAgICAgIGhlYWRlcnM6IHNpZ25lZEhlYWRlcnMsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKGVyciBpbnN0YW5jZW9mIEF4aW9zRXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1Jlc3BvbnNlIHN0YXR1cyBjb2RlOiAnLCBlcnIucmVzcG9uc2U/LnN0YXR1cywgJ0F4aW9zIGVycm9yIGRhdGE6ICcsIGVyci5yZXNwb25zZT8uZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0FuIGVycm9yIG9jY3VycmVkOiAnLCBlcnIpO1xuICAgIH1cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBzaWduZWRHZXQocGF0aDogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgY3JlZGVudGlhbHMgPSBhd2FpdCBjcmVkZW50aWFsc1Byb3ZpZGVyKCk7XG4gIFxuICAgIGNvbnN0IHNpZ25lciA9IG5ldyBTaWduYXR1cmVWNCh7XG4gICAgICBjcmVkZW50aWFscyxcbiAgICAgIHJlZ2lvbixcbiAgICAgIHNlcnZpY2U6ICdhb3NzJyxcbiAgICAgIHNoYTI1NjogU2hhMjU2LFxuICAgIH0pO1xuICBcbiAgICBjb25zdCByZXF1ZXN0ID0gbmV3IEh0dHBSZXF1ZXN0KHtcbiAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICBwcm90b2NvbDogJ2h0dHBzOicsXG4gICAgICBob3N0bmFtZTogbmV3IFVSTChjb2xsZWN0aW9uRW5kcG9pbnQpLmhvc3RuYW1lLFxuICAgICAgcGF0aCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgaG9zdDogbmV3IFVSTChjb2xsZWN0aW9uRW5kcG9pbnQpLmhvc3RuYW1lLFxuICAgICAgfSxcbiAgICB9KTtcbiAgXG4gICAgY29uc3Qgc2lnbmVkUmVxdWVzdCA9IGF3YWl0IHNpZ25lci5zaWduKHJlcXVlc3QpO1xuXG4gICAgY29uc3Qgc2lnbmVkSGVhZGVycyA9IHNpZ25lZFJlcXVlc3QuaGVhZGVycztcbiAgXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvcy5nZXQoYCR7Y29sbGVjdGlvbkVuZHBvaW50fSR7cGF0aH1gLCB7XG4gICAgICBoZWFkZXJzOiBzaWduZWRIZWFkZXJzLFxuICAgIH0pO1xuICBcbiAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKGVyciBpbnN0YW5jZW9mIEF4aW9zRXJyb3IpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdBeGlvcyBlcnJvciBkYXRhOiAnLCBlcnIucmVzcG9uc2U/LmRhdGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZygnQW4gZXJyb3Igb2NjdXJyZWQ6ICcsIGVycik7XG4gICAgfVxuICB9XG59XG5cbi8qXG5Lbm93biB3b3JraW5nIE9TUyBlbmRwb2ludHM6XG4gICogJy9zZW1hbnRpYy1jYWNoZS1pbmRleCcgKEdFVCByZXF1ZXN0IHJldHVybnMgaW5kZXggc2NoZW1hKVxuICAqICcvc2VtYW50aWMtY2FjaGUtaW5kZXgvX3NlYXJjaCdcbiAgKiBcbiovXG4iXX0=