// === lambda/migrateLogs.ts ===
import {
  DynamoDBClient,
  ScanCommand,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { parseAsync } from 'json2csv';

const dynamoClient = new DynamoDBClient({});
const s3Client = new S3Client({});

const LOG_TABLE_NAME = process.env.LOG_TABLE_NAME!;
const LOG_BUCKET_NAME = process.env.LOG_BUCKET_NAME!;

const FIVE_MINUTES = 5 * 60 * 1000;

export const handler = async () => {
  const cutoffDate = new Date(Date.now() - FIVE_MINUTES);

  const logs: any[] = [];
  let ExclusiveStartKey;

  do {
    const result = await dynamoClient.send(
      new ScanCommand({
        TableName: LOG_TABLE_NAME,
        FilterExpression: '#ts <= :cutoff',
        ExpressionAttributeNames: {
          '#ts': 'timestamp',
        },
        ExpressionAttributeValues: {
          ':cutoff': { S: cutoffDate.toISOString() },
        },
        ExclusiveStartKey,
      })
    );

    logs.push(...(result.Items || []));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  if (!logs.length) return { message: 'No logs to migrate.' };

  const transformed = logs.map((item) => ({
    id: item.id?.S,
    timestamp: item.timestamp?.S,
    latency: item.latency?.N,
    is_successful: item.is_successful?.BOOL,
    success_reason: item.success_reason?.S,
    error_reason: item.error_reason?.S,
    model_routing_history: item.model_routing_history?.S,
    user_id: item.user_id?.S,
    metadata: item.metadata?.S,
    thread_id: item.thread_id?.S,
    provider: item.provider?.S,
    model: item.model?.S,
    cost: item.cost?.N,
    raw_request: item.raw_request?.S,
    raw_response: item.raw_response?.S,
    error_message: item.error_message?.S,
  }));

  const csv = await parseAsync(transformed);
  const objectKey = `logs/parquet/migrated-${new Date().toISOString()}-${uuidv4()}.csv`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: LOG_BUCKET_NAME,
      Key: objectKey,
      Body: csv,
      ContentType: 'text/csv',
    })
  );

  // Delete from DynamoDB
  for (let i = 0; i < logs.length; i += 25) {
    const batch = logs.slice(i, i + 25);
    await dynamoClient.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [LOG_TABLE_NAME]: batch.map((item) => ({
            DeleteRequest: {
              Key: {
                PK: item.PK,
                SK: item.SK,
              },
            },
          })),
        },
      })
    );
  }

  return { message: 'Migration complete', migrated: logs.length };
};
