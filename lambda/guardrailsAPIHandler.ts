import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { z } from 'zod';

const CreateGuardrailSchema = z.object({
  text: z.string(),
});

// STEPS
// 1. Give permission
// 2. add env var for opensearch endpoint
// 3.

const s3 = new S3Client({});

async function getGuardrailsFromOpenSearch() {
  await Promise.resolve(setTimeout(() => {}, 2000));
  return [
    {
      id: String(Math.random()),
      text: 'Guardrail 1',
    },
    {
      id: String(Math.random()),
      text: 'Guardrail 2',
    },
  ];
}

async function deleteGuardrailFromOpenSearchById(id: string) {
  await Promise.resolve(setTimeout(() => {}, 2000));
  return id;
}

async function addGuardrailToOpenSearch(guardrail: string) {
  await Promise.resolve(setTimeout(() => {}, 2000));
  return {
    id: String(Math.random()),
    text: guardrail,
  };
}

// helper to convert stream to string

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { httpMethod, pathParameters, body } = event;
  const guardrailId = pathParameters?.id;
  const { GUARDRAILS_BUCKET = '', GUARDRAILS_KEY = '' } = process.env;

  console.log({
    httpMethod: httpMethod,
    pathParameters: pathParameters,
    body: body,
  });

  try {
    switch (httpMethod) {
      case 'GET': {
        try {
          const guardrails = await getGuardrailsFromOpenSearch();
          return {
            statusCode: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(guardrails),
          };
        } catch (error) {
          return {
            statusCode: 500,
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              message: 'Internal Server Error',
              error: (error as Error).message,
            }),
          };
        }
      }

      case 'POST': {
        try {
          const { text: guardrailText } = CreateGuardrailSchema.parse(
            body ? JSON.parse(body) : {}
          );
          const savedGuardrail = await addGuardrailToOpenSearch(guardrailText);
          return {
            statusCode: 201,
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(savedGuardrail),
          };
        } catch (error) {
          console.error('Error in POST request:', error);
          return {
            statusCode: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              message: 'Could not save guardrail',
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          };
        }
      }

      case 'DELETE': {
        if (!guardrailId) {
          return {
            statusCode: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              message: 'Guardrail ID is required',
            }),
          };
        }

        try {
          await deleteGuardrailFromOpenSearchById(guardrailId);
          return {
            statusCode: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              message: 'Guardrail deleted',
            }),
          };
        } catch (error) {
          return {
            statusCode: 500,
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              message: 'Could not delete guardrail',
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          };
        }
      }

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
