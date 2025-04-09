import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'; 
// APIGatewayProxyEvent: type of event Lambda receives when triggered by API Gateway in proxy mode - default for CDK

const s3 = new S3Client({});
const bucket = process.env.CONFIG_BUCKET_NAME!;
const key = 'configs/config.json';

export const handler = async ({ queryStringParameters }: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = queryStringParameters?.method || 'get';

  try {
    const command =
      method === 'put'
        ? new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: 'application/json',
          })
        : new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes

    return {
      statusCode: 200,
      body: JSON.stringify({ url: signedUrl }),
    };
  } catch (err) {
    console.error('Error generating presigned URL:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate presigned URL' }),
    };
  }
}
