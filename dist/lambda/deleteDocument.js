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
const axios_1 = __importStar(require("axios"));
const protocol_http_1 = require("@aws-sdk/protocol-http");
const signature_v4_1 = require("@aws-sdk/signature-v4");
const credential_provider_node_1 = require("@aws-sdk/credential-provider-node");
const sha256_js_1 = require("@aws-crypto/sha256-js");
const region = process.env.AWS_REGION;
const collectionEndpoint = process.env.OPENSEARCH_ENDPOINT;
const indexName = process.env.OPENSEARCH_INDEX;
const credentialsProvider = (0, credential_provider_node_1.defaultProvider)();
const handler = async (event) => {
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
    }
    catch (err) {
        console.log('an error occurred: ', JSON.stringify(err));
    }
};
exports.handler = handler;
async function signedDelete(path) {
    try {
        const credentials = await credentialsProvider();
        const signer = new signature_v4_1.SignatureV4({
            credentials,
            region,
            service: 'aoss',
            sha256: sha256_js_1.Sha256,
        });
        const request = new protocol_http_1.HttpRequest({
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
        const response = await axios_1.default.delete(`${collectionEndpoint}${path}`, {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVsZXRlRG9jdW1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9sYW1iZGEvZGVsZXRlRG9jdW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQ0FBMEM7QUFDMUMsMERBQXFEO0FBQ3JELHdEQUFvRDtBQUNwRCxnRkFBb0U7QUFDcEUscURBQStDO0FBRS9DLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVyxDQUFDO0FBQ3ZDLE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBb0IsQ0FBQztBQUM1RCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDO0FBQy9DLE1BQU0sbUJBQW1CLEdBQUcsSUFBQSwwQ0FBZSxHQUFFLENBQUM7QUFFdkMsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTZCLEVBQUUsRUFBRTtJQUM3RCxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUV2RCxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsS0FBSyxDQUFDO0lBQzdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLFVBQVUsRUFBRSxDQUFDLENBQUM7SUFFeEQsSUFBSSxDQUFDO1FBQ0gsTUFBTSxRQUFRLEdBQUcsTUFBTSxZQUFZLENBQUMsSUFBSSxTQUFTLFNBQVMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUN4RSxPQUFPLENBQUMsR0FBRyxDQUFDLGdDQUFnQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN4RSxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsWUFBWSxVQUFVLHVCQUF1QjtTQUN2RCxDQUFDO0lBQ0osQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDYixPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMxRCxDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBaEJXLFFBQUEsT0FBTyxXQWdCbEI7QUFFRixLQUFLLFVBQVUsWUFBWSxDQUFDLElBQVk7SUFDdEMsSUFBSSxDQUFDO1FBQ0gsTUFBTSxXQUFXLEdBQUcsTUFBTSxtQkFBbUIsRUFBRSxDQUFDO1FBRWhELE1BQU0sTUFBTSxHQUFHLElBQUksMEJBQVcsQ0FBQztZQUM3QixXQUFXO1lBQ1gsTUFBTTtZQUNOLE9BQU8sRUFBRSxNQUFNO1lBQ2YsTUFBTSxFQUFFLGtCQUFNO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxPQUFPLEdBQUcsSUFBSSwyQkFBVyxDQUFDO1lBQzlCLE1BQU0sRUFBRSxRQUFRO1lBQ2hCLFFBQVEsRUFBRSxRQUFRO1lBQ2xCLFFBQVEsRUFBRSxJQUFJLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFFBQVE7WUFDOUMsSUFBSTtZQUNKLE9BQU8sRUFBRTtnQkFDUCxNQUFNLEVBQUUsSUFBSSxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxRQUFRO2FBQzdDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFhLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWpELE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFFNUMsTUFBTSxRQUFRLEdBQUcsTUFBTSxlQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsa0JBQWtCLEdBQUcsSUFBSSxFQUFFLEVBQUU7WUFDbEUsT0FBTyxFQUFFLGFBQWE7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDO0lBQ3ZCLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxHQUFHLFlBQVksa0JBQVUsRUFBRSxDQUFDO1lBQzlCLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxRyxDQUFDO2FBQU0sQ0FBQztZQUNOLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDNUMsQ0FBQztJQUNILENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGF4aW9zLCB7IEF4aW9zRXJyb3IgfSBmcm9tICdheGlvcyc7XG5pbXBvcnQgeyBIdHRwUmVxdWVzdCB9IGZyb20gJ0Bhd3Mtc2RrL3Byb3RvY29sLWh0dHAnO1xuaW1wb3J0IHsgU2lnbmF0dXJlVjQgfSBmcm9tICdAYXdzLXNkay9zaWduYXR1cmUtdjQnO1xuaW1wb3J0IHsgZGVmYXVsdFByb3ZpZGVyIH0gZnJvbSAnQGF3cy1zZGsvY3JlZGVudGlhbC1wcm92aWRlci1ub2RlJztcbmltcG9ydCB7IFNoYTI1NiB9IGZyb20gJ0Bhd3MtY3J5cHRvL3NoYTI1Ni1qcyc7XG5cbmNvbnN0IHJlZ2lvbiA9IHByb2Nlc3MuZW52LkFXU19SRUdJT04hO1xuY29uc3QgY29sbGVjdGlvbkVuZHBvaW50ID0gcHJvY2Vzcy5lbnYuT1BFTlNFQVJDSF9FTkRQT0lOVCE7XG5jb25zdCBpbmRleE5hbWUgPSBwcm9jZXNzLmVudi5PUEVOU0VBUkNIX0lOREVYO1xuY29uc3QgY3JlZGVudGlhbHNQcm92aWRlciA9IGRlZmF1bHRQcm92aWRlcigpO1xuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogeyBkb2N1bWVudElkOiBzdHJpbmcgfSkgPT4ge1xuICBjb25zb2xlLmxvZygncmVjZWl2ZWQgZXZlbnQ6ICcsIEpTT04uc3RyaW5naWZ5KGV2ZW50KSk7XG4gIFxuICBjb25zdCB7IGRvY3VtZW50SWQgfSA9IGV2ZW50O1xuICBjb25zb2xlLmxvZyhgRGVsZXRpbmcgZG9jdW1lbnQgd2l0aCBJRDogJHtkb2N1bWVudElkfWApO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzaWduZWREZWxldGUoYC8ke2luZGV4TmFtZX0vX2RvYy8ke2RvY3VtZW50SWR9YCk7XG4gICAgY29uc29sZS5sb2coJ3Jlc3BvbnNlIGZvciBkZWxldGUgZG9jdW1lbnQ6ICcsIEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIG1lc3NhZ2U6IGBEb2N1bWVudCAke2RvY3VtZW50SWR9IGRlbGV0ZWQgc3VjY2Vzc2Z1bGx5YCxcbiAgICB9O1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLmxvZygnYW4gZXJyb3Igb2NjdXJyZWQ6ICcsIEpTT04uc3RyaW5naWZ5KGVycikpO1xuICB9XG59O1xuXG5hc3luYyBmdW5jdGlvbiBzaWduZWREZWxldGUocGF0aDogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgY3JlZGVudGlhbHMgPSBhd2FpdCBjcmVkZW50aWFsc1Byb3ZpZGVyKCk7XG5cbiAgICBjb25zdCBzaWduZXIgPSBuZXcgU2lnbmF0dXJlVjQoe1xuICAgICAgY3JlZGVudGlhbHMsXG4gICAgICByZWdpb24sXG4gICAgICBzZXJ2aWNlOiAnYW9zcycsXG4gICAgICBzaGEyNTY6IFNoYTI1NixcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlcXVlc3QgPSBuZXcgSHR0cFJlcXVlc3Qoe1xuICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgIHByb3RvY29sOiAnaHR0cHM6JyxcbiAgICAgIGhvc3RuYW1lOiBuZXcgVVJMKGNvbGxlY3Rpb25FbmRwb2ludCkuaG9zdG5hbWUsXG4gICAgICBwYXRoLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnaG9zdCc6IG5ldyBVUkwoY29sbGVjdGlvbkVuZHBvaW50KS5ob3N0bmFtZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBzaWduZWRSZXF1ZXN0ID0gYXdhaXQgc2lnbmVyLnNpZ24ocmVxdWVzdCk7XG5cbiAgICBjb25zdCBzaWduZWRIZWFkZXJzID0gc2lnbmVkUmVxdWVzdC5oZWFkZXJzO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvcy5kZWxldGUoYCR7Y29sbGVjdGlvbkVuZHBvaW50fSR7cGF0aH1gLCB7XG4gICAgICBoZWFkZXJzOiBzaWduZWRIZWFkZXJzLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmIChlcnIgaW5zdGFuY2VvZiBBeGlvc0Vycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdSZXNwb25zZSBzdGF0dXMgY29kZTogJywgZXJyLnJlc3BvbnNlPy5zdGF0dXMsICdBeGlvcyBlcnJvciBkYXRhOiAnLCBlcnIucmVzcG9uc2U/LmRhdGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdBbiBlcnJvciBvY2N1cnJlZDogJywgZXJyKTtcbiAgICB9XG4gIH1cbn0iXX0=