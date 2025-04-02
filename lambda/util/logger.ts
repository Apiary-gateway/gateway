import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import * as parquets from 'parquets';
import * as os from 'os';
import * as path from 'path';
import { readFile, unlink } from 'fs/promises';

const LOG_BUCKET = process.env.LOG_BUCKET_NAME;
const LOG_TABLE_NAME = process.env.LOG_TABLE_NAME;

if (!LOG_BUCKET || !LOG_TABLE_NAME) {
  throw new Error('LOG_BUCKET_NAME and LOG_TABLE_NAME must be set');
}

interface StructuredLogData {
  id: string;
  timestamp: string;
  latency: bigint;
  status: 'success' | 'error';
  model_routing_history: string;
  user_id: string | null;
  metadata: string | null;
  thread_id: string | null;
  provider: string | null;
  model: string | null;
  cost: number | null;
  raw_request: string | null;
  raw_response: string | null;
  error_message: string | null;
}

export class Logger {
  // Class variables
  private static s3: S3Client = new S3Client({});
  private static ddb: DynamoDBClient = new DynamoDBClient({});

  // Instance variables
  private requestStartTime: Date;
  private status: 'success' | 'failure';
  private thread_id: string | null;
  private provider: string | null;
  private model: string | null;
  private model_routing_history: { model: string; latency: number }[];
  private cost: number | null;
  private raw_request: string | null;
  private raw_response: string | null;
  private error_message: string | null;

  constructor() {
    this.requestStartTime = new Date();
    this.status = 'failure';
    this.model_routing_history = [];
    this.thread_id = null;
    this.provider = null;
    this.model = null;
    this.cost = null;
    this.raw_request = null;
    this.raw_response = null;
  }

  private async logRequest() {
    const structuredLog: StructuredLogData = {
      id: uuidv4(),
      timestamp: this.requestStartTime.toISOString(),
      latency: BigInt(Date.now() - this.requestStartTime.getTime()),
      status: this.status === 'success' ? 'success' : 'error',
      model_routing_history: JSON.stringify(this.model_routing_history),
      thread_id: this.thread_id,
      provider: this.provider,
      model: this.model,
      cost: this.cost,
      raw_request: this.raw_request,
      raw_response: this.raw_response,
      error_message: this.error_message,
    };

    // Write to Parquet
    const schema = new parquets.ParquetSchema({
      id: { type: 'UTF8' },
      timestamp: { type: 'UTF8' },
      latency: { type: 'INT64' },
      status: { type: 'UTF8' },
      model_routing_history: { type: 'UTF8' },
      thread_id: { type: 'UTF8', optional: true },
      provider: { type: 'UTF8', optional: true },
      model: { type: 'UTF8', optional: true },
      cost: { type: 'DOUBLE', optional: true },
      raw_request: { type: 'UTF8', optional: true },
      raw_response: { type: 'UTF8', optional: true },
      error_message: { type: 'UTF8', optional: true },
    });

    const tmpFilePath = path.join(os.tmpdir(), `${structuredLog.id}.parquet`);
    const writer = await parquets.ParquetWriter.openFile(schema, tmpFilePath);
    await writer.appendRow(structuredLog);
    await writer.close();

    const buffer = await readFile(tmpFilePath);
    await unlink(tmpFilePath);

    const date = structuredLog.timestamp.split('T')[0];
    const key = `logs/parquet/status=${
      structuredLog.status
    }/date=${date}/provider=${structuredLog.provider ?? 'unknown'}/model=${
      structuredLog.model ?? 'unknown'
    }/${structuredLog.id}.parquet`;

    await Logger.s3.send(
      new PutObjectCommand({
        Bucket: LOG_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: 'application/octet-stream',
      })
    );

    // Write to DynamoDB
    await Logger.ddb.send(
      new PutItemCommand({
        TableName: LOG_TABLE_NAME,
        Item: {
          PK: { S: 'LOG' },
          SK: { S: `TS#${structuredLog.timestamp}` },
          id: { S: structuredLog.id },
          timestamp: { S: structuredLog.timestamp },
          latency: { N: structuredLog.latency.toString() },
          status: { S: structuredLog.status },
          model_routing_history: { S: structuredLog.model_routing_history },
          thread_id: structuredLog.thread_id
            ? { S: structuredLog.thread_id }
            : { NULL: true },
          provider: structuredLog.provider
            ? { S: structuredLog.provider }
            : { NULL: true },
          model: structuredLog.model
            ? { S: structuredLog.model }
            : { NULL: true },
          cost: structuredLog.cost
            ? { N: structuredLog.cost.toString() }
            : { NULL: true },
          raw_request: structuredLog.raw_request
            ? { S: structuredLog.raw_request }
            : { NULL: true },
          raw_response: structuredLog.raw_response
            ? { S: structuredLog.raw_response }
            : { NULL: true },
          error_message: structuredLog.error_message
            ? { S: structuredLog.error_message }
            : { NULL: true },
        },
      })
    );
  }

  addModelRoutingHistory(model: string) {
    this.model_routing_history = [
      ...this.model_routing_history,
      {
        model,
        latency: Date.now() - this.requestStartTime.getTime(),
      },
    ];
  }

  logError(errorMessage: string) {
    this.error_message = errorMessage;
    this.status = 'failure';
    this.logRequest();
  }

  logSuccess(rawResponse: string) {
    this.status = 'success';
    try {
      this.raw_response = JSON.stringify(JSON.parse(rawResponse), null, 2);
    } catch (e) {
      this.raw_response = rawResponse;
    }

    this.logRequest();
  }
}
