import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import * as parquets from 'parquets';
import * as os from 'os';
import * as path from 'path';
import { readFile, unlink } from 'fs/promises';
import { RoutingLog } from './types';

const LOG_BUCKET = process.env.LOG_BUCKET_NAME;
const LOG_TABLE_NAME = process.env.LOG_TABLE_NAME;

if (!LOG_BUCKET || !LOG_TABLE_NAME) {
  throw new Error('LOG_BUCKET_NAME and LOG_TABLE_NAME must be set');
}

interface StructuredLogData {
  id: string;
  timestamp: number; // epoch millis
  latency: bigint;
  is_successful: boolean;
  success_reason: string | null;
  error_reason: string | null;
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
  private static s3: S3Client = new S3Client({});
  private static ddb: DynamoDBClient = new DynamoDBClient({});

  private requestStartTime: Date;
  private is_successful: boolean;
  private user_id: string | null;
  private metadata: string | null;
  private success_reason: string | null;
  private error_reason: string | null;
  private model_routing_history: string[];
  private thread_id: string | null;
  private provider: string | null;
  private model: string | null;
  private cost: number | null;
  private raw_request: string | null;
  private raw_response: string | null;
  private error_message: string | null;

  constructor() {
    this.requestStartTime = new Date();
    this.is_successful = false;
    this.user_id = null;
    this.metadata = null;
    this.success_reason = null;
    this.error_reason = null;
    this.model_routing_history = [];
    this.thread_id = null;
    this.provider = null;
    this.model = null;
    this.cost = null;
    this.raw_request = null;
    this.raw_response = null;
    this.error_message = null;
  }

  private async log(): Promise<void> {
    const structuredLog: StructuredLogData = {
      id: uuidv4(),
      timestamp: this.requestStartTime.getTime(),
      latency: BigInt(Date.now() - this.requestStartTime.getTime()),
      is_successful: this.is_successful,
      success_reason: this.success_reason,
      error_reason: this.error_reason,
      model_routing_history: JSON.stringify(this.model_routing_history),
      user_id: this.user_id,
      metadata: this.metadata,
      thread_id: this.thread_id,
      provider: this.provider,
      model: this.model,
      cost: this.cost,
      raw_request: this.raw_request,
      raw_response: this.raw_response,
      error_message: this.error_message,
    };

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

    const tmpFilePath = path.join(os.tmpdir(), `${structuredLog.id}.parquet`);
    const writer = await parquets.ParquetWriter.openFile(schema, tmpFilePath);
    await writer.appendRow(structuredLog);
    await writer.close();

    const buffer = await readFile(tmpFilePath);
    await unlink(tmpFilePath);

    const isoDate = new Date(structuredLog.timestamp).toISOString();
    const date = isoDate.split('T')[0];

    const key = `logs/parquet/is_successful=${
      structuredLog.is_successful
    }/date=${date}/provider=${structuredLog.provider ?? ''}/model=${
      structuredLog.model ?? ''
    }/${structuredLog.id}.parquet`;

    await Logger.s3.send(
      new PutObjectCommand({
        Bucket: LOG_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: 'application/octet-stream',
      })
    );

    await Logger.ddb.send(
      new PutItemCommand({
        TableName: LOG_TABLE_NAME,
        Item: {
          PK: { S: 'LOG' },
          SK: { S: `TS#${isoDate}` },
          id: { S: structuredLog.id },
          timestamp: { S: isoDate },
          latency: { N: structuredLog.latency.toString() },
          is_successful: { BOOL: structuredLog.is_successful },
          success_reason: structuredLog.success_reason
            ? { S: structuredLog.success_reason }
            : { NULL: true },
          error_reason: structuredLog.error_reason
            ? { S: structuredLog.error_reason }
            : { NULL: true },
          model_routing_history: { S: structuredLog.model_routing_history },
          user_id: structuredLog.user_id
            ? { S: structuredLog.user_id }
            : { NULL: true },
          metadata: structuredLog.metadata
            ? { S: structuredLog.metadata }
            : { NULL: true },
          thread_id: structuredLog.thread_id
            ? { S: structuredLog.thread_id }
            : { NULL: true },
          provider: structuredLog.provider
            ? { S: structuredLog.provider }
            : { NULL: true },
          model: structuredLog.model
            ? { S: structuredLog.model }
            : { NULL: true },
          cost:
            structuredLog.cost !== null
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

  setRawRequest(rawRequest: string) {
    this.raw_request = rawRequest;
  }

  setInitialData(
    threadId: string,
    userId: string | undefined,
    metadata: string
  ) {
    this.thread_id = threadId;
    this.user_id = userId || null;
    this.metadata = metadata;
  }

  async logSuccessData(
    model: string,
    provider: string,
    modelRoutingHistory: RoutingLog,
    successReason: string,
    rawResponse: string
  ) {
    const modelRoutingHistoryJsonArray = modelRoutingHistory.events.map((e) =>
      JSON.stringify(e, null, 2)
    );

    this.model = model;
    this.provider = provider;
    this.model_routing_history = modelRoutingHistoryJsonArray;
    this.success_reason = successReason;
    this.raw_response = rawResponse;
    this.is_successful = true;

    await this.log();
  }

  async logErrorData(errorReason: string, errorMessage: string) {
    this.error_reason = errorReason;
    this.error_message = errorMessage;

    await this.log();
  }
}
