"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const protocol_http_1 = require("@aws-sdk/protocol-http");
const credential_provider_node_1 = require("@aws-sdk/credential-provider-node");
const signature_v4_1 = require("@aws-sdk/signature-v4");
const sha256_js_1 = require("@aws-crypto/sha256-js");
const axios_1 = require("axios");
const https = require("https");
const region = process.env.AWS_REGION;
const collectionEndpoint = process.env.OPENSEARCH_ENDPOINT;
const indexName = process.env.OPENSEARCH_INDEX;
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
        // await sendCfnResponse(event, context, 'SUCCESS', {message: 'Index already exists'});
        return { PhysicalResourceId: `Index-${indexName}` };
    }
    catch (err) {
        if (err instanceof axios_1.AxiosError && err.response?.status === 404) {
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
            // await sendCfnResponse(event, context, 'SUCCESS', {message: 'Index created'});
            return { PhysicalResourceId: `Index-${indexName}` };
        }
        else {
            console.error("Error checking or creating index: ", err);
            // await sendCfnResponse(event, context, 'FAILED');
            throw err;
        }
    }
};
exports.handler = handler;
// Using Provider framework - shouldn't need this function anymore
async function sendCfnResponse(event, context, responseStatus, responseData, physicalResourceId, noEcho) {
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
    return new Promise((resolve, reject) => {
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
function maskCredentialsAndSignature(message) {
    return message.replace(/X-Amz-Credential=[^&\s]+/i, 'X-Amz-Credential=*****')
        .replace(/X-Amz-Signature=[^&\s]+/i, 'X-Amz-Signature=*****');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVjdG9ySW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9sYW1iZGEvdmVjdG9ySW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMERBQXFEO0FBQ3JELGdGQUFvRTtBQUNwRSx3REFBb0Q7QUFDcEQscURBQStDO0FBQy9DLGlDQUEwQztBQUUxQywrQkFBK0I7QUFFL0IsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFXLENBQUM7QUFDdkMsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFvQixDQUFDO0FBQzVELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUM7QUFDL0MsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLENBQUMsZ0NBQWdDO0FBQ3hELE1BQU0sbUJBQW1CLEdBQUcsSUFBQSwwQ0FBZSxHQUFFLENBQUM7QUFFdkMsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTZCLEVBQUUsT0FBZ0IsRUFBRSxFQUFFO0lBQy9FLE1BQU0sV0FBVyxHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQztJQUVoRCxNQUFNLE1BQU0sR0FBRyxJQUFJLDBCQUFXLENBQUM7UUFDN0IsV0FBVztRQUNYLE9BQU87UUFDUCxNQUFNO1FBQ04sTUFBTSxFQUFFLGtCQUFNO0tBQ2YsQ0FBQyxDQUFDO0lBRUgsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLDJCQUFXLENBQUM7UUFDaEQsTUFBTSxFQUFFLE1BQU07UUFDZCxRQUFRLEVBQUUsSUFBSSxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxRQUFRO1FBQzlDLElBQUksRUFBRSxJQUFJLFNBQVMsRUFBRTtRQUNyQixPQUFPLEVBQUU7WUFDUCxJQUFJLEVBQUUsSUFBSSxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxRQUFRO1NBQzNDO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsTUFBTSxhQUFhLEdBQUcs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U0FBUywyQkFBMkIsQ0FBQyxPQUFlO0lBQ2xELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSx3QkFBd0IsQ0FBQztTQUMxRSxPQUFPLENBQUMsMEJBQTBCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztBQUNsRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSHR0cFJlcXVlc3QgfSBmcm9tIFwiQGF3cy1zZGsvcHJvdG9jb2wtaHR0cFwiO1xuaW1wb3J0IHsgZGVmYXVsdFByb3ZpZGVyIH0gZnJvbSBcIkBhd3Mtc2RrL2NyZWRlbnRpYWwtcHJvdmlkZXItbm9kZVwiO1xuaW1wb3J0IHsgU2lnbmF0dXJlVjQgfSBmcm9tIFwiQGF3cy1zZGsvc2lnbmF0dXJlLXY0XCI7XG5pbXBvcnQgeyBTaGEyNTYgfSBmcm9tIFwiQGF3cy1jcnlwdG8vc2hhMjU2LWpzXCI7XG5pbXBvcnQgYXhpb3MsIHsgQXhpb3NFcnJvciB9IGZyb20gXCJheGlvc1wiO1xuaW1wb3J0IHsgQ2RrQ3VzdG9tUmVzb3VyY2VFdmVudCwgQ29udGV4dCB9IGZyb20gXCJhd3MtbGFtYmRhXCI7XG5pbXBvcnQgKiBhcyBodHRwcyBmcm9tIFwiaHR0cHNcIjtcblxuY29uc3QgcmVnaW9uID0gcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiE7XG5jb25zdCBjb2xsZWN0aW9uRW5kcG9pbnQgPSBwcm9jZXNzLmVudi5PUEVOU0VBUkNIX0VORFBPSU5UITtcbmNvbnN0IGluZGV4TmFtZSA9IHByb2Nlc3MuZW52Lk9QRU5TRUFSQ0hfSU5ERVg7XG5jb25zdCBzZXJ2aWNlID0gXCJhb3NzXCI7IC8vIGZvciBBV1MgT3BlblNlYXJjaCBTZXJ2ZXJsZXNzXG5jb25zdCBjcmVkZW50aWFsc1Byb3ZpZGVyID0gZGVmYXVsdFByb3ZpZGVyKCk7XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBDZGtDdXN0b21SZXNvdXJjZUV2ZW50LCBjb250ZXh0OiBDb250ZXh0KSA9PiB7XG4gIGNvbnN0IGNyZWRlbnRpYWxzID0gYXdhaXQgY3JlZGVudGlhbHNQcm92aWRlcigpO1xuXG4gIGNvbnN0IHNpZ25lciA9IG5ldyBTaWduYXR1cmVWNCh7XG4gICAgY3JlZGVudGlhbHMsXG4gICAgc2VydmljZSxcbiAgICByZWdpb24sXG4gICAgc2hhMjU2OiBTaGEyNTYsXG4gIH0pO1xuXG4gIGNvbnN0IGNoZWNrSWZJbmRleEV4aXN0c1JlcXVlc3QgPSBuZXcgSHR0cFJlcXVlc3Qoe1xuICAgIG1ldGhvZDogXCJIRUFEXCIsXG4gICAgaG9zdG5hbWU6IG5ldyBVUkwoY29sbGVjdGlvbkVuZHBvaW50KS5ob3N0bmFtZSxcbiAgICBwYXRoOiBgLyR7aW5kZXhOYW1lfWAsXG4gICAgaGVhZGVyczoge1xuICAgICAgaG9zdDogbmV3IFVSTChjb2xsZWN0aW9uRW5kcG9pbnQpLmhvc3RuYW1lLFxuICAgIH0sXG4gIH0pO1xuXG4gIGNvbnN0IHNpZ25lZFJlcXVlc3QgPSBhd2FpdCBzaWduZXIuc2lnbihjaGVja0lmSW5kZXhFeGlzdHNSZXF1ZXN0KTtcblxuICBjb25zdCB7IG1ldGhvZCwgaGVhZGVycyB9ID0gc2lnbmVkUmVxdWVzdDtcbiAgY29uc3QgaW5kZXhVcmwgPSBgJHtjb2xsZWN0aW9uRW5kcG9pbnR9LyR7aW5kZXhOYW1lfWA7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBpbmRleEV4aXN0cyA9IGF3YWl0IGF4aW9zLnJlcXVlc3QoeyBtZXRob2QsIHVybDogaW5kZXhVcmwsIGhlYWRlcnMgfSk7XG4gICAgY29uc29sZS5sb2coXCJJbmRleCBhbHJlYWR5IGV4aXN0cywgcmVzcG9uc2Ugc3RhdHVzOlwiLCBpbmRleEV4aXN0cy5zdGF0dXMpO1xuICAgIC8vIGF3YWl0IHNlbmRDZm5SZXNwb25zZShldmVudCwgY29udGV4dCwgJ1NVQ0NFU1MnLCB7bWVzc2FnZTogJ0luZGV4IGFscmVhZHkgZXhpc3RzJ30pO1xuICAgIHJldHVybiB7UGh5c2ljYWxSZXNvdXJjZUlkOiBgSW5kZXgtJHtpbmRleE5hbWV9YH07XG4gIH0gY2F0Y2ggKGVycjogdW5rbm93bikge1xuICAgIGlmIChlcnIgaW5zdGFuY2VvZiBBeGlvc0Vycm9yICYmIGVyci5yZXNwb25zZT8uc3RhdHVzID09PSA0MDQpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBJbmRleCAnJHtpbmRleE5hbWV9JyBub3QgZm91bmQsIGNyZWF0aW5nLi4uYCk7XG5cbiAgICAgIGNvbnN0IGluZGV4ID0ge1xuICAgICAgICBcImFsaWFzZXNcIjoge30sXG4gICAgICAgIFwibWFwcGluZ3NcIjoge1xuICAgICAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgICAgICBcImVtYmVkZGluZ1wiOiB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImtubl92ZWN0b3JcIixcbiAgICAgICAgICAgICAgXCJkaW1lbnNpb25cIjogMTAyNCxcbiAgICAgICAgICAgICAgXCJtZXRob2RcIjoge1xuICAgICAgICAgICAgICAgIFwiZW5naW5lXCI6IFwibm1zbGliXCIsXG4gICAgICAgICAgICAgICAgXCJzcGFjZV90eXBlXCI6IFwiY29zaW5lc2ltaWxcIixcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJobnN3XCIsXG4gICAgICAgICAgICAgICAgXCJwYXJhbWV0ZXJzXCI6IHt9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImxsbVJlc3BvbnNlXCI6IHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJyZXF1ZXN0VGV4dFwiOiB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInRleHRcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwibW9kZWxcIjoge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJrZXl3b3JkXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInByb3ZpZGVyXCI6IHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwia2V5d29yZFwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJ0aW1lc3RhbXBcIjoge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJkYXRlXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInVzZXJJZFwiOiB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImtleXdvcmRcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzZXR0aW5nc1wiOiB7XG4gICAgICAgICAgXCJpbmRleFwiOiB7XG4gICAgICAgICAgICBcIm51bWJlcl9vZl9zaGFyZHNcIjogXCIyXCIsXG4gICAgICAgICAgICBcImtubi5hbGdvX3BhcmFtXCI6IHtcbiAgICAgICAgICAgICAgICBcImVmX3NlYXJjaFwiOiBcIjUxMlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJrbm5cIjogXCJ0cnVlXCIsXG4gICAgICAgICAgICBcIm51bWJlcl9vZl9yZXBsaWNhc1wiOiBcIjBcIlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCBjcmVhdGVJbmRleFJlcXVlc3QgPSBuZXcgSHR0cFJlcXVlc3Qoe1xuICAgICAgICBtZXRob2Q6IFwiUFVUXCIsXG4gICAgICAgIGhvc3RuYW1lOiBuZXcgVVJMKGNvbGxlY3Rpb25FbmRwb2ludCkuaG9zdG5hbWUsXG4gICAgICAgIHBhdGg6IGAvJHtpbmRleE5hbWV9YCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIGhvc3Q6IG5ldyBVUkwoY29sbGVjdGlvbkVuZHBvaW50KS5ob3N0bmFtZSxcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoaW5kZXgpLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHNpZ25lZENyZWF0ZUluZGV4UmVxdWVzdCA9IGF3YWl0IHNpZ25lci5zaWduKGNyZWF0ZUluZGV4UmVxdWVzdCk7XG5cbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYXhpb3MucmVxdWVzdCh7XG4gICAgICAgIG1ldGhvZDogc2lnbmVkQ3JlYXRlSW5kZXhSZXF1ZXN0Lm1ldGhvZCxcbiAgICAgICAgdXJsOiBpbmRleFVybCxcbiAgICAgICAgaGVhZGVyczogc2lnbmVkQ3JlYXRlSW5kZXhSZXF1ZXN0LmhlYWRlcnMsXG4gICAgICAgIGRhdGE6IHNpZ25lZENyZWF0ZUluZGV4UmVxdWVzdC5ib2R5LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnNvbGUubG9nKFwiSW5kZXggY3JlYXRlZDogXCIsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgLy8gYXdhaXQgc2VuZENmblJlc3BvbnNlKGV2ZW50LCBjb250ZXh0LCAnU1VDQ0VTUycsIHttZXNzYWdlOiAnSW5kZXggY3JlYXRlZCd9KTtcbiAgICAgIHJldHVybiB7UGh5c2ljYWxSZXNvdXJjZUlkOiBgSW5kZXgtJHtpbmRleE5hbWV9YH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBjaGVja2luZyBvciBjcmVhdGluZyBpbmRleDogXCIsIGVycik7XG4gICAgICAvLyBhd2FpdCBzZW5kQ2ZuUmVzcG9uc2UoZXZlbnQsIGNvbnRleHQsICdGQUlMRUQnKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH1cbn07XG5cbi8vIFVzaW5nIFByb3ZpZGVyIGZyYW1ld29yayAtIHNob3VsZG4ndCBuZWVkIHRoaXMgZnVuY3Rpb24gYW55bW9yZVxuYXN5bmMgZnVuY3Rpb24gc2VuZENmblJlc3BvbnNlKFxuICBldmVudDogQ2RrQ3VzdG9tUmVzb3VyY2VFdmVudCwgXG4gIGNvbnRleHQ6IENvbnRleHQsIFxuICByZXNwb25zZVN0YXR1czogJ1NVQ0NFU1MnIHwgJ0ZBSUxFRCcsIFxuICByZXNwb25zZURhdGE/OiB1bmtub3duLCBcbiAgcGh5c2ljYWxSZXNvdXJjZUlkPzogc3RyaW5nLCBcbiAgbm9FY2hvPzogYm9vbGVhblxuKSB7XG4gIGNvbnNvbGUubG9nKCdmdWxsIGV2ZW50OiAnLCBKU09OLnN0cmluZ2lmeShldmVudCkpO1xuICBcbiAgY29uc3QgcmVzcG9uc2VCb2R5ID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgIFN0YXR1czogcmVzcG9uc2VTdGF0dXMsXG4gICAgUmVhc29uOiBcIlNlZSB0aGUgZGV0YWlscyBpbiBDbG91ZFdhdGNoIExvZyBTdHJlYW06IFwiICsgY29udGV4dC5sb2dTdHJlYW1OYW1lLFxuICAgIFBoeXNpY2FsUmVzb3VyY2VJZDogcGh5c2ljYWxSZXNvdXJjZUlkIHx8IGNvbnRleHQubG9nU3RyZWFtTmFtZSxcbiAgICBTdGFja0lkOiBldmVudC5TdGFja0lkLFxuICAgIFJlcXVlc3RJZDogZXZlbnQuUmVxdWVzdElkLFxuICAgIExvZ2ljYWxSZXNvdXJjZUlkOiBldmVudC5Mb2dpY2FsUmVzb3VyY2VJZCxcbiAgICBOb0VjaG86IG5vRWNobyB8fCBmYWxzZSxcbiAgICBEYXRhOiByZXNwb25zZURhdGEgfHwge30sXG4gIH0pO1xuXG4gIGNvbnNvbGUubG9nKFwiUmVzcG9uc2UgYm9keTpcXG5cIiwgcmVzcG9uc2VCb2R5KTtcblxuICBjb25zdCBwYXJzZWRVcmwgPSBuZXcgVVJMKGV2ZW50LlJlc3BvbnNlVVJMKTtcbiAgY29uc29sZS5sb2coJ3BhcnNlZCByZXNwb25zZSBVUkw6ICcsIHBhcnNlZFVybCk7XG4gIFxuICBjb25zdCBvcHRpb25zID0ge1xuICAgIGhvc3RuYW1lOiBwYXJzZWRVcmwuaG9zdG5hbWUsXG4gICAgcG9ydDogNDQzLFxuICAgIHBhdGg6IHBhcnNlZFVybC5wYXRobmFtZSxcbiAgICBtZXRob2Q6IFwiUFVUXCIsXG4gICAgaGVhZGVyczoge1xuICAgICAgXCJjb250ZW50LXR5cGVcIjogXCJcIixcbiAgICAgIFwiY29udGVudC1sZW5ndGhcIjogQnVmZmVyLmJ5dGVMZW5ndGgocmVzcG9uc2VCb2R5KVxuICAgIH1cbiAgfTtcblxuICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IHJlcXVlc3QgPSBodHRwcy5yZXF1ZXN0KG9wdGlvbnMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgY29uc29sZS5sb2coXCJDbG91ZEZvcm1hdGlvbiByZXNwb25zZSBzdGF0dXMgY29kZTogXCIsIHJlc3BvbnNlLnN0YXR1c0NvZGUpO1xuICAgICAgY29uc29sZS5sb2coXCJDbG91ZEZvcm1hdGlvbiByZXNwb25zZTogXCIsIEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSk7XG4gICAgICByZXNvbHZlKCk7XG4gICAgfSk7XG4gIFxuICAgIHJlcXVlc3Qub24oXCJlcnJvclwiLCAoZXJyb3IpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFwic2VuZCguLikgZmFpbGVkIGV4ZWN1dGluZyBodHRwcy5yZXF1ZXN0KC4uKTogXCIgKyBtYXNrQ3JlZGVudGlhbHNBbmRTaWduYXR1cmUoU3RyaW5nKGVycm9yKSkpO1xuICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICB9KTtcbiAgXG4gICAgcmVxdWVzdC53cml0ZShyZXNwb25zZUJvZHkpO1xuICAgIHJlcXVlc3QuZW5kKCk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBtYXNrQ3JlZGVudGlhbHNBbmRTaWduYXR1cmUobWVzc2FnZTogc3RyaW5nKSB7XG4gIHJldHVybiBtZXNzYWdlLnJlcGxhY2UoL1gtQW16LUNyZWRlbnRpYWw9W14mXFxzXSsvaSwgJ1gtQW16LUNyZWRlbnRpYWw9KioqKionKVxuICAgIC5yZXBsYWNlKC9YLUFtei1TaWduYXR1cmU9W14mXFxzXSsvaSwgJ1gtQW16LVNpZ25hdHVyZT0qKioqKicpO1xufVxuIl19