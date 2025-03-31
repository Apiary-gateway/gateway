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

const getTodayDate = (): string => new Date().toISOString().split('T')[0];

const mapDynamoItem = (item: any) => ({
  id: item.id?.S,
  thread_ts: item.thread_ts?.S,
  timestamp: item.timestamp?.S,
  latency: item.latency?.N,
  provider: item.provider?.S,
  model: item.model?.S,
  tokens_used: item.tokens_used?.N,
  cost: item.cost?.N,
  raw_request: item.raw_request?.S,
  raw_response: item.raw_response?.S || null,
  error_message: item.error_message?.S || null,
  status: item.status?.S,
});

const mapAthenaRow = (row: any) => {
  const data = row.Data || [];
  return {
    id: data[0]?.VarCharValue,
    timestamp: data[1]?.VarCharValue,
    status: data[2]?.VarCharValue,
    provider: data[3]?.VarCharValue,
    model: data[4]?.VarCharValue,
    latency: data[5]?.VarCharValue,
  };
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const queryParams = event.queryStringParameters || {};
    const older = queryParams.older === 'true';
    const page = parseInt(queryParams.page || '1', 10);
    const nextToken = queryParams.nextToken || null;

    console.log('Request parameters:', { older, page, nextToken });

    if (isNaN(page) || page < 1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid page number' }),
      };
    }

    let logs: any[] = [];
    let responseNextToken: string | null = null;

    if (older) {
      console.log('Querying Athena with pagination');
      const athenaQuery = `
        SELECT id, timestamp, status, provider, model, latency
        FROM "ai_gateway_logs"
        ORDER BY date DESC, timestamp DESC
      `;
      console.log('Athena query:', athenaQuery);

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
      console.log('Started Athena query execution:', queryExecutionId);

      let queryState: string | undefined;
      do {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const queryExecutionResult = await athenaClient.send(
          new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId })
        );
        queryState = queryExecutionResult.QueryExecution?.Status?.State;
        console.log('Athena query state:', queryState);
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

      const getQueryResultsInput: any = {
        QueryExecutionId: queryExecutionId,
        MaxResults: PAGE_SIZE + 1, // +1 for header on first page
      };
      if (nextToken) {
        getQueryResultsInput.NextToken = nextToken;
      }

      const queryResults = await athenaClient.send(
        new GetQueryResultsCommand(getQueryResultsInput)
      );
      console.log('Raw Athena results:', JSON.stringify(queryResults));

      const rows = queryResults.ResultSet?.Rows || [];
      logs = (!nextToken && rows.length > 0 ? rows.slice(1) : rows).map(
        mapAthenaRow
      );
      console.log('Mapped logs from Athena:', { count: logs.length });

      responseNextToken = queryResults.NextToken || null;
      console.log('Athena NextToken:', responseNextToken);
    } else {
      console.log('Querying DynamoDB with pagination');
      const today = getTodayDate();
      const clientLastKey = nextToken
        ? JSON.parse(decodeURIComponent(nextToken))
        : undefined;
      const dynamoQuery = new QueryCommand({
        TableName: LOG_TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': { S: 'LOG' },
          ':sk': { S: `TS#${today}` },
        },
        Limit: PAGE_SIZE,
        ExclusiveStartKey: clientLastKey,
        ScanIndexForward: true,
      });

      const dynamoResult = await dynamoClient.send(dynamoQuery);
      logs = dynamoResult.Items?.map(mapDynamoItem) || [];
      responseNextToken = dynamoResult.LastEvaluatedKey
        ? encodeURIComponent(JSON.stringify(dynamoResult.LastEvaluatedKey))
        : null;
      console.log('DynamoDB results:', {
        items: logs.length,
        nextToken: responseNextToken,
      });
    }

    console.log('Successfully returning results');
    return {
      statusCode: 200,
      body: JSON.stringify({
        logs,
        page,
        pageSize: PAGE_SIZE,
        nextToken: responseNextToken,
      }),
    };
  } catch (error) {
    console.error('Error in logs handler:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error fetching logs',
        error: String(error),
      }),
    };
  }
};

// export const handler = async (event: any) => {
//   console.log('Logs Lambda invoked:', event);
//   return {
//     statusCode: 200,
//     body: JSON.stringify([{ id: 'test', message: 'Dummy log' }]),
//   };
// };
