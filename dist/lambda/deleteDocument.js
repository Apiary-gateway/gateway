"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const axios_1 = require("axios");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVsZXRlRG9jdW1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9sYW1iZGEvZGVsZXRlRG9jdW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsaUNBQTBDO0FBQzFDLDBEQUFxRDtBQUNyRCx3REFBb0Q7QUFDcEQsZ0ZBQW9FO0FBQ3BFLHFEQUErQztBQUUvQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVcsQ0FBQztBQUN2QyxNQUFNLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW9CLENBQUM7QUFDNUQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQztBQUMvQyxNQUFNLG1CQUFtQixHQUFHLElBQUEsMENBQWUsR0FBRSxDQUFDO0FBRXZDLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUE2QixFQUFFLEVBQUU7SUFDN0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFFdkQsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLEtBQUssQ0FBQztJQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixVQUFVLEVBQUUsQ0FBQyxDQUFDO0lBRXhELElBQUksQ0FBQztRQUNILE1BQU0sUUFBUSxHQUFHLE1BQU0sWUFBWSxDQUFDLElBQUksU0FBUyxTQUFTLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDeEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDeEUsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLFlBQVksVUFBVSx1QkFBdUI7U0FDdkQsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQztBQUNILENBQUMsQ0FBQztBQWhCVyxRQUFBLE9BQU8sV0FnQmxCO0FBRUYsS0FBSyxVQUFVLFlBQVksQ0FBQyxJQUFZO0lBQ3RDLElBQUksQ0FBQztRQUNILE1BQU0sV0FBVyxHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQztRQUVoRCxNQUFNLE1BQU0sR0FBRyxJQUFJLDBCQUFXLENBQUM7WUFDN0IsV0FBVztZQUNYLE1BQU07WUFDTixPQUFPLEVBQUUsTUFBTTtZQUNmLE1BQU0sRUFBRSxrQkFBTTtTQUNmLENBQUMsQ0FBQztRQUVILE1BQU0sT0FBTyxHQUFHLElBQUksMkJBQVcsQ0FBQztZQUM5QixNQUFNLEVBQUUsUUFBUTtZQUNoQixRQUFRLEVBQUUsUUFBUTtZQUNsQixRQUFRLEVBQUUsSUFBSSxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxRQUFRO1lBQzlDLElBQUk7WUFDSixPQUFPLEVBQUU7Z0JBQ1AsTUFBTSxFQUFFLElBQUksR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsUUFBUTthQUM3QztTQUNGLENBQUMsQ0FBQztRQUVILE1BQU0sYUFBYSxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVqRCxNQUFNLGFBQWEsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDO1FBRTVDLE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLGtCQUFrQixHQUFHLElBQUksRUFBRSxFQUFFO1lBQ2xFLE9BQU8sRUFBRSxhQUFhO1NBQ3ZCLENBQUMsQ0FBQztRQUVILE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQztJQUN2QixDQUFDO0lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNiLElBQUksR0FBRyxZQUFZLGtCQUFVLEVBQUUsQ0FBQztZQUM5QixPQUFPLENBQUMsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUcsQ0FBQzthQUFNLENBQUM7WUFDTixPQUFPLENBQUMsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzVDLENBQUM7SUFDSCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBheGlvcywgeyBBeGlvc0Vycm9yIH0gZnJvbSAnYXhpb3MnO1xuaW1wb3J0IHsgSHR0cFJlcXVlc3QgfSBmcm9tICdAYXdzLXNkay9wcm90b2NvbC1odHRwJztcbmltcG9ydCB7IFNpZ25hdHVyZVY0IH0gZnJvbSAnQGF3cy1zZGsvc2lnbmF0dXJlLXY0JztcbmltcG9ydCB7IGRlZmF1bHRQcm92aWRlciB9IGZyb20gJ0Bhd3Mtc2RrL2NyZWRlbnRpYWwtcHJvdmlkZXItbm9kZSc7XG5pbXBvcnQgeyBTaGEyNTYgfSBmcm9tICdAYXdzLWNyeXB0by9zaGEyNTYtanMnO1xuXG5jb25zdCByZWdpb24gPSBwcm9jZXNzLmVudi5BV1NfUkVHSU9OITtcbmNvbnN0IGNvbGxlY3Rpb25FbmRwb2ludCA9IHByb2Nlc3MuZW52Lk9QRU5TRUFSQ0hfRU5EUE9JTlQhO1xuY29uc3QgaW5kZXhOYW1lID0gcHJvY2Vzcy5lbnYuT1BFTlNFQVJDSF9JTkRFWDtcbmNvbnN0IGNyZWRlbnRpYWxzUHJvdmlkZXIgPSBkZWZhdWx0UHJvdmlkZXIoKTtcblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IHsgZG9jdW1lbnRJZDogc3RyaW5nIH0pID0+IHtcbiAgY29uc29sZS5sb2coJ3JlY2VpdmVkIGV2ZW50OiAnLCBKU09OLnN0cmluZ2lmeShldmVudCkpO1xuICBcbiAgY29uc3QgeyBkb2N1bWVudElkIH0gPSBldmVudDtcbiAgY29uc29sZS5sb2coYERlbGV0aW5nIGRvY3VtZW50IHdpdGggSUQ6ICR7ZG9jdW1lbnRJZH1gKTtcblxuICB0cnkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgc2lnbmVkRGVsZXRlKGAvJHtpbmRleE5hbWV9L19kb2MvJHtkb2N1bWVudElkfWApO1xuICAgIGNvbnNvbGUubG9nKCdyZXNwb25zZSBmb3IgZGVsZXRlIGRvY3VtZW50OiAnLCBKU09OLnN0cmluZ2lmeShyZXNwb25zZSkpO1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICBtZXNzYWdlOiBgRG9jdW1lbnQgJHtkb2N1bWVudElkfSBkZWxldGVkIHN1Y2Nlc3NmdWxseWAsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS5sb2coJ2FuIGVycm9yIG9jY3VycmVkOiAnLCBKU09OLnN0cmluZ2lmeShlcnIpKTtcbiAgfVxufTtcblxuYXN5bmMgZnVuY3Rpb24gc2lnbmVkRGVsZXRlKHBhdGg6IHN0cmluZykge1xuICB0cnkge1xuICAgIGNvbnN0IGNyZWRlbnRpYWxzID0gYXdhaXQgY3JlZGVudGlhbHNQcm92aWRlcigpO1xuXG4gICAgY29uc3Qgc2lnbmVyID0gbmV3IFNpZ25hdHVyZVY0KHtcbiAgICAgIGNyZWRlbnRpYWxzLFxuICAgICAgcmVnaW9uLFxuICAgICAgc2VydmljZTogJ2Fvc3MnLFxuICAgICAgc2hhMjU2OiBTaGEyNTYsXG4gICAgfSk7XG5cbiAgICBjb25zdCByZXF1ZXN0ID0gbmV3IEh0dHBSZXF1ZXN0KHtcbiAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICBwcm90b2NvbDogJ2h0dHBzOicsXG4gICAgICBob3N0bmFtZTogbmV3IFVSTChjb2xsZWN0aW9uRW5kcG9pbnQpLmhvc3RuYW1lLFxuICAgICAgcGF0aCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ2hvc3QnOiBuZXcgVVJMKGNvbGxlY3Rpb25FbmRwb2ludCkuaG9zdG5hbWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3Qgc2lnbmVkUmVxdWVzdCA9IGF3YWl0IHNpZ25lci5zaWduKHJlcXVlc3QpO1xuXG4gICAgY29uc3Qgc2lnbmVkSGVhZGVycyA9IHNpZ25lZFJlcXVlc3QuaGVhZGVycztcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYXhpb3MuZGVsZXRlKGAke2NvbGxlY3Rpb25FbmRwb2ludH0ke3BhdGh9YCwge1xuICAgICAgaGVhZGVyczogc2lnbmVkSGVhZGVycyxcbiAgICB9KTtcblxuICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoZXJyIGluc3RhbmNlb2YgQXhpb3NFcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignUmVzcG9uc2Ugc3RhdHVzIGNvZGU6ICcsIGVyci5yZXNwb25zZT8uc3RhdHVzLCAnQXhpb3MgZXJyb3IgZGF0YTogJywgZXJyLnJlc3BvbnNlPy5kYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcignQW4gZXJyb3Igb2NjdXJyZWQ6ICcsIGVycik7XG4gICAgfVxuICB9XG59Il19