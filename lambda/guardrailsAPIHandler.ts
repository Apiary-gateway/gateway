import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { signedPost } from './util/vectorSearch';
import { signedDelete } from './deleteDocument';
import { z } from 'zod';
import { getEmbedding } from './util/vectorSearch';

const SendSignedPostRequestResponseSchema = z.object({
  hits: z.object({
    hits: z.array(
      z.object({
        _id: z.string(),
        _source: z.object({
          text: z.string(),
        }),
      })
    ),
  }),
});

const {
  OPENSEARCH_ENDPOINT = '',
  OPENSEARCH_GUARDRAILS_INDEX = 'guardrails-index',
} = process.env;

const CreateGuardrailSchema = z.object({
  text: z.string(),
});

// STEPS
// 1. Give permission
// 2. add env var for opensearch endpoint
// 3.

const s3 = new S3Client({});

async function getGuardrailsFromOpenSearch() {
  const data = await signedPost(`/${OPENSEARCH_GUARDRAILS_INDEX}/_search`, {
    query: {
      match_all: {},
    },
  });
  console.log('data ingetGuardrailsFromOpenSearch', data.hits.hits);
  const parsedData = SendSignedPostRequestResponseSchema.parse(data);

  const guardrails = parsedData.hits.hits.map((hit) => ({
    id: hit._id,
    text: hit._source.text,
  }));

  return guardrails;
}

async function deleteGuardrailFromOpenSearchById(id: string) {
  try {
    const deleteResponse = await signedDelete(
      `/${OPENSEARCH_GUARDRAILS_INDEX}/_doc/${id}`
    );
    if (deleteResponse.result !== 'deleted') {
      throw new Error('Failed to delete guardrail from OpenSearch');
    }
  } catch (error) {
    throw new Error('Failed to delete guardrail from OpenSearch');
  }
}

async function addGuardrailToOpenSearch(guardrail: string) {
  const embedding = await getEmbedding(guardrail);

  const data = await signedPost(`/${OPENSEARCH_GUARDRAILS_INDEX}/_doc`, {
    text: guardrail,
    embedding
  });

  if (data.result !== 'created') {
    throw new Error('Failed to add guardrail to OpenSearch');
  }
}

// helper to convert stream to string

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { httpMethod, pathParameters, body } = event;
  const guardrailId = pathParameters?.id;

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
          await addGuardrailToOpenSearch(guardrailText);
          return {
            statusCode: 201,
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
            body: '',
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
