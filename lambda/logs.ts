import { APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import {
  AthenaClient,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
} from '@aws-sdk/client-athena';

const dynamoClient = new DynamoDBClient({});
const athenaClient = new AthenaClient({});
const LOG_TABLE_NAME = process.env.LOG_TABLE_NAME || '';
const LOG_BUCKET_NAME = process.env.LOG_BUCKET_NAME || '';
const ATHENA_WORKGROUP = process.env.ATHENA_WORKGROUP || 'llm_logs_workgroup';
const ATHENA_DATABASE = 'ai_gateway_logs_db';
const PAGE_SIZE = 15;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

const mapDynamoItem = (item: any) => ({
  id: item.id?.S || '',
  timestamp: item.timestamp?.S || '',
  latency: item.latency?.N || '',
  is_successful: item.is_successful?.BOOL ?? null,
  success_reason: item.success_reason?.S || null,
  error_reason: item.error_reason?.S || null,
  model_routing_history: item.model_routing_history?.S || '',
  user_id: item.user_id?.S || null,
  metadata: item.metadata?.S || null,
  thread_id: item.thread_id?.S || null,
  provider: item.provider?.S || null,
  model: item.model?.S || null,
  cost: item.cost?.N || null,
  raw_request: item.raw_request?.S || null,
  raw_response: item.raw_response?.S || null,
  error_message: item.error_message?.S || null,
});

const mapAthenaRow = (row: any) => {
  const d = row.Data || [];
  return {
    id: d[0]?.VarCharValue || '',
    timestamp: d[1]?.VarCharValue || '',
    latency: d[2]?.VarCharValue || '',
    is_successful: d[3]?.VarCharValue === 'true',
    success_reason: d[4]?.VarCharValue || null,
    error_reason: d[5]?.VarCharValue || null,
    model_routing_history: d[6]?.VarCharValue || '',
    user_id: d[7]?.VarCharValue || null,
    metadata: d[8]?.VarCharValue || null,
    thread_id: d[9]?.VarCharValue || null,
    provider: d[10]?.VarCharValue || null,
    model: d[11]?.VarCharValue || null,
    cost: d[12]?.VarCharValue || null,
    raw_request: d[13]?.VarCharValue || null,
    raw_response: d[14]?.VarCharValue || null,
    error_message: d[15]?.VarCharValue || null,
  };
};

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> => {
  console.log('Full raw event:', JSON.stringify(event, null, 2));
  const queryParams = event.queryStringParameters || {};
  console.log('Query params:', queryParams);

  try {
    const older = queryParams.older === 'true';
    const page = parseInt(queryParams.page || '1', 10);
    const nextToken = queryParams.nextToken || null;
    let queryExecutionId = queryParams.queryExecutionId || null;

    console.log('Request parameters:', {
      older,
      page,
      nextToken,
      queryExecutionId,
    });

    if (isNaN(page) || page < 1) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Invalid page number' }),
      };
    }

    let logs: any[] = [];
    let responseNextToken: string | null = null;

    if (older) {
      if (!queryExecutionId) {
        const athenaQuery = `
          SELECT 
            id, timestamp, latency, is_successful, success_reason, error_reason,
            model_routing_history, user_id, metadata, thread_id, provider, model,
            cost, raw_request, raw_response, error_message
          FROM ai_gateway_logs
          ORDER BY date DESC, timestamp DESC
        `;

        const startQuery = new StartQueryExecutionCommand({
          QueryString: athenaQuery,
          WorkGroup: ATHENA_WORKGROUP,
          ResultConfiguration: {
            OutputLocation: `s3://${LOG_BUCKET_NAME}/athena-results/`,
          },
          QueryExecutionContext: {
            Database: ATHENA_DATABASE,
          },
        });

        const queryExecution = await athenaClient.send(startQuery);
        queryExecutionId = queryExecution.QueryExecutionId!;
        let queryState: string | undefined;
        do {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const queryExecutionResult = await athenaClient.send(
            new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId })
          );
          queryState = queryExecutionResult.QueryExecution?.Status?.State;
        } while (queryState === 'RUNNING' || queryState === 'QUEUED');

        if (queryState === 'FAILED') {
          const errorDetails = await athenaClient.send(
            new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId })
          );
          throw new Error(
            'Athena query failed: ' +
              errorDetails.QueryExecution?.Status?.StateChangeReason
          );
        }
      }

      const getQueryResultsInput: any = {
        QueryExecutionId: queryExecutionId,
        MaxResults: PAGE_SIZE + 1,
      };

      if (nextToken) {
        getQueryResultsInput.NextToken = nextToken;
      }

      const queryResults = await athenaClient.send(
        new GetQueryResultsCommand(getQueryResultsInput)
      );
      const rows = queryResults.ResultSet?.Rows || [];

      logs = rows.length > 1 ? rows.slice(1).map(mapAthenaRow) : [];
      responseNextToken = queryResults.NextToken || null;

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          logs,
          page,
          pageSize: PAGE_SIZE,
          nextToken: responseNextToken,
          queryExecutionId,
        }),
      };
    }

    // DynamoDB fallback path
    const clientLastKey = nextToken
      ? JSON.parse(decodeURIComponent(nextToken))
      : undefined;

    const dynamoQuery = new QueryCommand({
      TableName: LOG_TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': { S: 'LOG' },
      },
      Limit: PAGE_SIZE,
      ExclusiveStartKey: clientLastKey,
      ScanIndexForward: false, // latest logs first
    });

    const dynamoResult = await dynamoClient.send(dynamoQuery);
    logs = dynamoResult.Items?.map(mapDynamoItem) || [];
    responseNextToken = dynamoResult.LastEvaluatedKey
      ? encodeURIComponent(JSON.stringify(dynamoResult.LastEvaluatedKey))
      : null;

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        logs,
        page,
        pageSize: PAGE_SIZE,
        nextToken: responseNextToken,
      }),
    };
  } catch (error) {
    console.error('Error in logs handler:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Error fetching logs',
        error: String(error),
      }),
    };
  }
};
