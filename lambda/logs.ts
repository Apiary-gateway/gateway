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
// Read the Athena workgroup name from the environment variable.
const ATHENA_WORKGROUP = process.env.ATHENA_WORKGROUP || 'llm_logs_workgroup';
const ATHENA_DATABASE = 'ai_gateway_logs_db';
const PAGE_SIZE = 1;

// Utility to get today's date in yyyy-MM-dd format.
const getTodayDate = (): string => new Date().toISOString().split('T')[0];

// Map DynamoDB items to a consistent format with all fields.
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

// Map Athena rows to a consistent format.
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
    const older = queryParams.older === 'true'; // ?older=true for Athena, otherwise DynamoDB
    // For DynamoDB, page is used; for Athena, use nextToken.
    const page = parseInt(queryParams.page || '1', 10);

    console.log('Request parameters:', { older, page, queryParams });

    if (!older && (isNaN(page) || page < 1)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid page number' }),
      };
    }

    let logs: any[] = [];
    let totalPages: number | undefined;
    let lastKey: any = null; // For DynamoDB, this is the native pagination token; for Athena, it's the NextToken.

    if (older) {
      console.log('Querying Athena for older logs');
      // Athena does not support OFFSET; rely on fixed LIMIT and NextToken for pagination.
      const today = getTodayDate();
      const athenaQuery = `
        SELECT id, timestamp, status, provider, model, latency
        FROM "ai_gateway_logs"
        ORDER BY date DESC, timestamp DESC
        LIMIT ${PAGE_SIZE}
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
      const queryExecutionId = queryExecution.QueryExecutionId;
      console.log('Started Athena query execution:', queryExecutionId);

      // Poll until the query is complete.
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
        console.error(
          'Athena query failed:',
          errorDetails.QueryExecution?.Status?.StateChangeReason
        );
        throw new Error(
          'Athena query failed: ' +
            errorDetails.QueryExecution?.Status?.StateChangeReason
        );
      }

      // Use NextToken for Athena pagination.
      const getQueryResultsInput: any = { QueryExecutionId: queryExecutionId };
      if (queryParams.nextToken) {
        getQueryResultsInput.NextToken = queryParams.nextToken;
      }
      const queryResults = await athenaClient.send(
        new GetQueryResultsCommand(getQueryResultsInput)
      );
      // Skip header row (first row) and map the remaining rows.
      logs = queryResults.ResultSet?.Rows?.slice(1).map(mapAthenaRow) || [];
      console.log('Retrieved logs from Athena:', { count: logs.length });

      // Capture the NextToken returned by Athena (if any)
      lastKey = queryResults.NextToken || null;

      // Optionally, calculate total pages on the first request (when no nextToken is provided).
      if (!queryParams.nextToken) {
        console.log('Calculating total pages for Athena');
        const countQuery = `
          SELECT COUNT(*) as total
          FROM "ai_gateway_logs"
          WHERE date < '${getTodayDate()}'
        `;
        const startCountQuery = new StartQueryExecutionCommand({
          QueryString: countQuery,
          WorkGroup: ATHENA_WORKGROUP,
          ResultConfiguration: {
            OutputLocation: `s3://${LOG_BUCKET_NAME}/athena-results/`,
          },
          QueryExecutionContext: { Database: ATHENA_DATABASE },
        });
        const countExecution = await athenaClient.send(startCountQuery);
        let countState: string | undefined;
        do {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const countExecutionResult = await athenaClient.send(
            new GetQueryExecutionCommand({
              QueryExecutionId: countExecution.QueryExecutionId,
            })
          );
          countState = countExecutionResult.QueryExecution?.Status?.State;
          console.log('Count query state:', countState);
        } while (countState === 'RUNNING' || countState === 'QUEUED');

        if (countState === 'SUCCEEDED') {
          const countResults = await athenaClient.send(
            new GetQueryResultsCommand({
              QueryExecutionId: countExecution.QueryExecutionId,
            })
          );
          const totalRows = parseInt(
            countResults.ResultSet?.Rows?.[1].Data?.[0].VarCharValue || '0',
            10
          );
          totalPages = Math.ceil(totalRows / PAGE_SIZE);
          console.log('Total rows and pages:', { totalRows, totalPages });
        }
      }
    } else {
      console.log("Querying DynamoDB for today's logs with native pagination");
      // For DynamoDB, use native pagination with ExclusiveStartKey.
      // Logger writes items with:
      // PK: "LOG" and SK: "TS#<timestamp>"
      const today = getTodayDate();
      const clientLastKey = queryParams.lastKey
        ? JSON.parse(decodeURIComponent(queryParams.lastKey))
        : undefined;
      const dynamoQuery = new QueryCommand({
        TableName: LOG_TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': { S: 'LOG' },
          // SK begins with "TS#" followed by today's date, e.g. "TS#2025-03-27"
          ':sk': { S: `TS#${today}` },
        },
        Limit: PAGE_SIZE,
        ExclusiveStartKey: clientLastKey,
        ScanIndexForward: true,
      });

      const dynamoResult = await dynamoClient.send(dynamoQuery);
      logs = dynamoResult.Items?.map(mapDynamoItem) || [];
      // Return the LastEvaluatedKey so the client can use it to fetch the next page.
      lastKey = dynamoResult.LastEvaluatedKey
        ? encodeURIComponent(JSON.stringify(dynamoResult.LastEvaluatedKey))
        : null;
      console.log('DynamoDB results:', { items: logs.length, lastKey });
    }

    console.log('Successfully returning results');
    return {
      statusCode: 200,
      body: JSON.stringify({
        logs,
        // For DynamoDB pagination, page and pageSize are used.
        // For Athena, use nextToken (returned as lastKey) for subsequent requests.
        page,
        pageSize: PAGE_SIZE,
        totalPages, // totalPages is available only for Athena queries (if calculated)
        lastKey, // For DynamoDB, this is the native pagination token; for Athena, it's the NextToken.
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
