import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3 = new S3Client({});

// helper to convert stream to string
async function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { httpMethod, pathParameters, body } = event;
  const guardrailId = pathParameters?.id;
  const { GUARDRAILS_BUCKET = '', GUARDRAILS_KEY = '' } = process.env;

  try {
    switch (httpMethod) {
      case 'GET': {
        // GET the object
        const getObjectResp = await s3.send(
          new GetObjectCommand({
            Bucket: GUARDRAILS_BUCKET,
            Key: GUARDRAILS_KEY,
          })
        );

        // read the body stream
        const fileBody = getObjectResp.Body
          ? await streamToString(getObjectResp.Body as Readable)
          : '[]';

        const utterances = JSON.parse(fileBody);

        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(utterances),
        };
      }

      // ... POST, DELETE, default, etc. ...

      default:
        return {
          statusCode: 405,
          body: JSON.stringify({
            message: `Method ${httpMethod} not allowed.`,
          }),
        };
    }
  } catch (error) {
    console.error('Error in guardrails lambda:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal Server Error',
        error: (error as Error).message,
      }),
    };
  }
};
