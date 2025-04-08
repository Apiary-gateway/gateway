import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { httpMethod, pathParameters, body } = event;
  const guardrailId = pathParameters?.id;

  try {
    switch (httpMethod) {
      case 'GET':
        // Handle GET /guardrails
        // Fetch and return guardrails from DB or wherever
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'GET /guardrails successful',
            data: [
              /* Example array of guardrail objects */
            ],
          }),
        };

      case 'POST':
        // Handle POST /guardrails
        // Parse incoming JSON
        const newGuardrail = body ? JSON.parse(body) : {};
        // Insert into a DB or other store
        return {
          statusCode: 201,
          body: JSON.stringify({
            message: 'Created new guardrail',
            data: newGuardrail,
          }),
        };

      case 'DELETE':
        // Handle DELETE /guardrails/{id}
        if (!guardrailId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing guardrail ID in path.' }),
          };
        }
        // Delete the guardrail from DB
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: `Deleted guardrail with id: ${guardrailId}`,
          }),
        };

      default:
        return {
          statusCode: 405, // Method Not Allowed
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
