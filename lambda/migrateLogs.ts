import {
  DynamoDBClient,
  ScanCommand,
  BatchWriteItemCommand,
  AttributeValue,
} from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as parquets from 'parquets';
import * as path from 'path';
import * as os from 'os';
import { readFile, unlink } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const ddb = new DynamoDBClient({});
const s3 = new S3Client({});

const TABLE_NAME = process.env.LOG_TABLE_NAME!;
const BUCKET_NAME = process.env.LOG_BUCKET_NAME!;

// Set cutoff to 5 minutes ago
const FIVE_MINUTES = 5 * 60 * 1000;

// Parquet schema matching your logs
const schema = new parquets.ParquetSchema({
  id: { type: 'UTF8' },
  timestamp: { type: 'INT64', originalType: 'TIMESTAMP_MILLIS' } as any,
  latency: { type: 'INT64' },
  is_successful: { type: 'BOOLEAN' },
  success_reason: { type: 'UTF8', optional: true },
  error_reason: { type: 'UTF8', optional: true },
  model_routing_history: { type: 'UTF8' },
  user_id: { type: 'UTF8', optional: true },
  metadata: { type: 'UTF8', optional: true },
  thread_id: { type: 'UTF8', optional: true },
  provider: { type: 'UTF8', optional: true },
  model: { type: 'UTF8', optional: true },
  cost: { type: 'DOUBLE', optional: true },
  raw_request: { type: 'UTF8', optional: true },
  raw_response: { type: 'UTF8', optional: true },
  error_message: { type: 'UTF8', optional: true },
});

export const handler = async () => {
  try {
    console.log('Starting migrateLogs handler...');

    // 1) Determine cutoff date (5 minutes ago)
    const cutoffDate = new Date(Date.now() - FIVE_MINUTES);
    console.log(`Cutoff date: ${cutoffDate.toISOString()}`);

    // 2) Scan for old logs
    const logs = await scanOldLogs(cutoffDate);

    if (!logs.length) {
      console.log('No logs to migrate.');
      return { message: 'No logs to migrate.' };
    }

    console.log(`Total items scanned from Dynamo: ${logs.length}`);

    // 3) Group logs by partition: is_successful, date, provider, model
    const partitioned: Record<string, any[]> = {};

    for (const item of logs) {
      // Print some debug info about the item key
      console.log(
        'DEBUG: Dynamo item ->',
        JSON.stringify({
          PK: item.PK?.S,
          SK: item.SK?.S,
          id: item.id?.S,
          timestamp: item.timestamp?.S,
        })
      );

      const row = mapDynamoItemToStructuredLog(item);
      console.log('DEBUG: Converted row ->', JSON.stringify(row));

      const isoDate = new Date(row.timestamp).toISOString(); // e.g. "2025-04-06T12:34:56.789Z"
      const dateOnly = isoDate.split('T')[0]; // e.g. "2025-04-06"
      const is_successful = row.is_successful ? 'true' : 'false';
      const provider = row.provider || 'unknown';
      const model = row.model || 'unknown';

      const partitionKey = `${is_successful}::${dateOnly}::${provider}::${model}`;
      if (!partitioned[partitionKey]) {
        partitioned[partitionKey] = [];
      }
      partitioned[partitionKey].push(row);
    }

    // 4) Write one Parquet file per partition
    for (const [partitionKey, items] of Object.entries(partitioned)) {
      const [is_successful, dateOnly, provider, model] =
        partitionKey.split('::');

      console.log(
        `DEBUG: Partition ${partitionKey} has ${items.length} items.`
      );

      // Write a single Parquet file locally to /tmp
      const parquetFile = path.join(os.tmpdir(), `batched-${uuidv4()}.parquet`);
      console.log(`DEBUG: Writing Parquet to temp file -> ${parquetFile}`);

      const writer = await parquets.ParquetWriter.openFile(schema, parquetFile);
      let rowCount = 0;
      for (const row of items) {
        await writer.appendRow(row);
        rowCount++;
      }
      await writer.close();

      console.log(
        `DEBUG: Finished writing ${rowCount} rows to Parquet file: ${parquetFile}`
      );

      // 5) Upload the parquet to S3
      const buffer = await readFile(parquetFile);
      const key = `logs/parquet/is_successful=${is_successful}/date=${dateOnly}/provider=${provider}/model=${model}/batch-${uuidv4()}.parquet`;

      console.log(
        `DEBUG: Uploading Parquet file to s3://${BUCKET_NAME}/${key}`
      );
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: 'application/octet-stream',
        })
      );

      console.log(
        `Uploaded partition ${partitionKey} to s3://${BUCKET_NAME}/${key}`
      );

      // Clean up local file
      await unlink(parquetFile);
      console.log(`DEBUG: Deleted temp file -> ${parquetFile}`);
    }

    // 6) Batch-delete from DynamoDB
    console.log('DEBUG: Deleting items from DynamoDB...');
    await deleteItemsFromDDB(logs);

    console.log(`Successfully migrated and deleted ${logs.length} items.`);
    return {
      message: 'Migration complete',
      totalItems: logs.length,
      partitions: Object.keys(partitioned).length,
    };
  } catch (err) {
    console.error('ERROR in migrateLogs handler:', err);
    throw err; // Rethrow so Lambda sees the error
  }
};

/**
 * Helper: SCAN old logs from DynamoDB
 */
async function scanOldLogs(cutoffDate: Date): Promise<any[]> {
  console.log('DEBUG: Starting scanOldLogs...');

  const items: any[] = [];
  let ExclusiveStartKey;

  do {
    console.log(
      `DEBUG: Scanning table ${TABLE_NAME}, with ExclusiveStartKey =`,
      JSON.stringify(ExclusiveStartKey)
    );

    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
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

    if (result.Items) {
      console.log(
        `DEBUG: Scan returned ${result.Items.length} items this page.`
      );
      items.push(...result.Items);
    } else {
      console.log('DEBUG: Scan returned 0 items this page.');
    }

    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  console.log(`DEBUG: Total items found after scan: ${items.length}`);
  return items;
}

/**
 * Helper: Convert raw Dynamo item -> typed log row for Parquet
 */
function mapDynamoItemToStructuredLog(item: Record<string, AttributeValue>) {
  // Convert timestamp to epoch millis (number)
  const isoTimestamp = item.timestamp?.S; // e.g. "2025-04-06T12:34:56.789Z"
  const epochMillis = isoTimestamp
    ? new Date(isoTimestamp).getTime()
    : Date.now();

  // Default cost to 0 if missing or invalid
  let costVal = 0;
  if (item.cost && item.cost.N !== undefined) {
    const parsedCost = Number(item.cost.N);
    if (!Number.isNaN(parsedCost)) {
      costVal = parsedCost;
    }
  }

  // Convert latency to a normal number instead of BigInt
  let latencyNum = 0;
  if (item.latency && item.latency.N !== undefined) {
    const parsedLatency = parseInt(item.latency.N, 10);
    if (!Number.isNaN(parsedLatency)) {
      latencyNum = parsedLatency;
    }
  }

  return {
    id: item.id?.S || uuidv4(),
    timestamp: epochMillis,
    latency: latencyNum, // a normal number now
    is_successful: item.is_successful?.BOOL || false,
    success_reason: item.success_reason?.S || null,
    error_reason: item.error_reason?.S || null,
    model_routing_history: item.model_routing_history?.S || '',
    user_id: item.user_id?.S || null,
    metadata: item.metadata?.S || null,
    thread_id: item.thread_id?.S || null,
    provider: item.provider?.S || null,
    model: item.model?.S || null,
    cost: costVal,
    raw_request: item.raw_request?.S || null,
    raw_response: item.raw_response?.S || null,
    error_message: item.error_message?.S || null,
  };
}

/**
 * Helper: Batch-delete items from DynamoDB (25 at a time)
 */
async function deleteItemsFromDDB(dynamoItems: any[]) {
  let totalDeleted = 0;

  for (let i = 0; i < dynamoItems.length; i += 25) {
    const batch = dynamoItems.slice(i, i + 25);

    console.log(
      `DEBUG: Deleting batch of ${batch.length} items from index [${i}:${
        i + 25
      }].`
    );

    await ddb.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [TABLE_NAME]: batch.map((item) => ({
            DeleteRequest: {
              // The "PK" and "SK" fields must match your table's real primary key fields
              Key: {
                PK: item.PK,
                SK: item.SK,
              },
            },
          })),
        },
      })
    );
    totalDeleted += batch.length;
  }

  console.log(`DEBUG: Finished deleting ${totalDeleted} items total.`);
}
