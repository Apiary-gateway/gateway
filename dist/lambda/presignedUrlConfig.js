"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
// APIGatewayProxyEvent: type of event Lambda receives when triggered by API Gateway in proxy mode - default for CDK
const s3 = new client_s3_1.S3Client({});
const bucket = process.env.CONFIG_BUCKET_NAME;
const key = 'configs/config.json';
const handler = async ({ queryStringParameters }) => {
    const method = queryStringParameters?.method || 'get';
    try {
        const command = method === 'put'
            ? new client_s3_1.PutObjectCommand({
                Bucket: bucket,
                Key: key,
                ContentType: 'application/json',
            })
            : new client_s3_1.GetObjectCommand({
                Bucket: bucket,
                Key: key,
            });
        const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3, command, { expiresIn: 300 }); // 5 minutes
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: signedUrl }),
        };
    }
    catch (err) {
        console.error('Error generating presigned URL:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to generate presigned URL' }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2lnbmVkVXJsQ29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGFtYmRhL3ByZXNpZ25lZFVybENvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxrREFBa0Y7QUFDbEYsd0VBQTZEO0FBRTdELG9IQUFvSDtBQUVwSCxNQUFNLEVBQUUsR0FBRyxJQUFJLG9CQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDNUIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBbUIsQ0FBQztBQUMvQyxNQUFNLEdBQUcsR0FBRyxxQkFBcUIsQ0FBQztBQUUzQixNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsRUFBRSxxQkFBcUIsRUFBd0IsRUFBa0MsRUFBRTtJQUMvRyxNQUFNLE1BQU0sR0FBRyxxQkFBcUIsRUFBRSxNQUFNLElBQUksS0FBSyxDQUFDO0lBRXRELElBQUksQ0FBQztRQUNILE1BQU0sT0FBTyxHQUNYLE1BQU0sS0FBSyxLQUFLO1lBQ2QsQ0FBQyxDQUFDLElBQUksNEJBQWdCLENBQUM7Z0JBQ25CLE1BQU0sRUFBRSxNQUFNO2dCQUNkLEdBQUcsRUFBRSxHQUFHO2dCQUNSLFdBQVcsRUFBRSxrQkFBa0I7YUFDaEMsQ0FBQztZQUNKLENBQUMsQ0FBQyxJQUFJLDRCQUFnQixDQUFDO2dCQUNuQixNQUFNLEVBQUUsTUFBTTtnQkFDZCxHQUFHLEVBQUUsR0FBRzthQUNULENBQUMsQ0FBQztRQUVULE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBQSxtQ0FBWSxFQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVk7UUFFbkYsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLDZCQUE2QixFQUFFLEdBQUc7Z0JBQ2xDLGNBQWMsRUFBRSxrQkFBa0I7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsQ0FBQztTQUN6QyxDQUFDO0lBQ0osQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDYixPQUFPLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3RELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLGtDQUFrQyxFQUFFLENBQUM7U0FDcEUsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUE7QUFqQ1ksUUFBQSxPQUFPLFdBaUNuQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFMzQ2xpZW50LCBQdXRPYmplY3RDb21tYW5kLCBHZXRPYmplY3RDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXMzJztcbmltcG9ydCB7IGdldFNpZ25lZFVybCB9IGZyb20gJ0Bhd3Mtc2RrL3MzLXJlcXVlc3QtcHJlc2lnbmVyJztcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJzsgXG4vLyBBUElHYXRld2F5UHJveHlFdmVudDogdHlwZSBvZiBldmVudCBMYW1iZGEgcmVjZWl2ZXMgd2hlbiB0cmlnZ2VyZWQgYnkgQVBJIEdhdGV3YXkgaW4gcHJveHkgbW9kZSAtIGRlZmF1bHQgZm9yIENES1xuXG5jb25zdCBzMyA9IG5ldyBTM0NsaWVudCh7fSk7XG5jb25zdCBidWNrZXQgPSBwcm9jZXNzLmVudi5DT05GSUdfQlVDS0VUX05BTUUhO1xuY29uc3Qga2V5ID0gJ2NvbmZpZ3MvY29uZmlnLmpzb24nO1xuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jICh7IHF1ZXJ5U3RyaW5nUGFyYW1ldGVycyB9OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XG4gIGNvbnN0IG1ldGhvZCA9IHF1ZXJ5U3RyaW5nUGFyYW1ldGVycz8ubWV0aG9kIHx8ICdnZXQnO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgY29tbWFuZCA9XG4gICAgICBtZXRob2QgPT09ICdwdXQnXG4gICAgICAgID8gbmV3IFB1dE9iamVjdENvbW1hbmQoe1xuICAgICAgICAgICAgQnVja2V0OiBidWNrZXQsXG4gICAgICAgICAgICBLZXk6IGtleSxcbiAgICAgICAgICAgIENvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgfSlcbiAgICAgICAgOiBuZXcgR2V0T2JqZWN0Q29tbWFuZCh7XG4gICAgICAgICAgICBCdWNrZXQ6IGJ1Y2tldCxcbiAgICAgICAgICAgIEtleToga2V5LFxuICAgICAgICAgIH0pO1xuXG4gICAgY29uc3Qgc2lnbmVkVXJsID0gYXdhaXQgZ2V0U2lnbmVkVXJsKHMzLCBjb21tYW5kLCB7IGV4cGlyZXNJbjogMzAwIH0pOyAvLyA1IG1pbnV0ZXNcblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyB1cmw6IHNpZ25lZFVybCB9KSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZW5lcmF0aW5nIHByZXNpZ25lZCBVUkw6JywgZXJyKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ZhaWxlZCB0byBnZW5lcmF0ZSBwcmVzaWduZWQgVVJMJyB9KSxcbiAgICB9O1xuICB9XG59XG4iXX0=