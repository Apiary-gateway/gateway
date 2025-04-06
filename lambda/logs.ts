import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
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
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('LOG_TABLE_NAME from env:', process.env.LOG_TABLE_NAME);

  try {
    const queryParams = event.queryStringParameters || {};
    const older = queryParams.older === 'true';
    const nextToken = queryParams.nextToken || null;

    let logs: any[] = [];
    let responseNextToken: string | null = null;

    if (older) {
      // Athena pagination using timestamp
      let athenaQuery = `
        SELECT 
          id, timestamp, latency, is_successful, success_reason, error_reason,
          model_routing_history, user_id, metadata, thread_id, provider, model,
          cost, raw_request, raw_response, error_message
        FROM ai_gateway_logs
      `;

      if (nextToken) {
        const lastTimestamp = decodeURIComponent(nextToken);
        athenaQuery += ` WHERE timestamp < '${lastTimestamp}'`;
      }

      // Removed ORDER BY to return data in default order
      athenaQuery += ` LIMIT ${PAGE_SIZE + 1}`;

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
      const queryExecutionId = queryExecution.QueryExecutionId!;

      // Poll for query completion
      let queryState: string | undefined;
      do {
        await new Promise((res) => setTimeout(res, 1000));
        const status = await athenaClient.send(
          new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId })
        );
        queryState = status.QueryExecution?.Status?.State;
      } while (queryState === 'RUNNING' || queryState === 'QUEUED');

      if (queryState === 'FAILED') {
        throw new Error('Athena query failed');
      }

      const queryResults = await athenaClient.send(
        new GetQueryResultsCommand({ QueryExecutionId: queryExecutionId })
      );

      let rows = queryResults.ResultSet?.Rows || [];
      if (rows.length > 0) {
        rows = rows.slice(1); // Skip header
      }

      const mappedRows = rows.map(mapAthenaRow);
      logs = mappedRows.slice(0, PAGE_SIZE);

      responseNextToken =
        mappedRows.length > PAGE_SIZE
          ? encodeURIComponent(mappedRows[PAGE_SIZE - 1].timestamp)
          : null;
    } else {
      let clientLastKey: any;

      if (nextToken) {
        try {
          clientLastKey = JSON.parse(decodeURIComponent(nextToken));
        } catch (error) {
          console.error('Invalid nextToken:', nextToken);
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid nextToken' }),
          };
        }
      }

      const dynamoQuery = new QueryCommand({
        TableName: LOG_TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': { S: 'LOG' },
        },
        Limit: PAGE_SIZE,
        ExclusiveStartKey: clientLastKey,
        // Removed ScanIndexForward to use default true (chronological)
      });

      const dynamoResult = await dynamoClient.send(dynamoQuery);
      console.log('DynamoDB result:', JSON.stringify(dynamoResult, null, 2)); // Debug log
      const items = dynamoResult.Items || [];
      logs = items.map(mapDynamoItem);

      if (items.length === 0 && nextToken) {
        console.warn(
          'No items returned with nextToken; possible data issue or end of results'
        );
      }

      responseNextToken = dynamoResult.LastEvaluatedKey
        ? encodeURIComponent(JSON.stringify(dynamoResult.LastEvaluatedKey))
        : null;

      console.log('Returned logs:', logs.length);
      console.log('Next token:', responseNextToken);
      console.log(
        'Returned log timestamps:',
        logs.map((log) => log.timestamp)
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        logs,
        pageSize: PAGE_SIZE,
        nextToken: responseNextToken,
        hasMore: !!responseNextToken,
      }),
    };
  } catch (error) {
    console.error('Error fetching logs:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error fetching logs',
        error: String(error),
      }),
    };
  }
};
