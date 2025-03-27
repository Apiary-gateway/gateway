import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as parquets from 'parquets';
import * as os from 'os';
import * as path from 'path';
import { readFile, unlink } from 'fs/promises';

export type VALID_PROVIDERS = 'openai' | 'anthropic' | 'gemini';
export type VALID_MODELS =
  | 'gpt-3.5-turbo'
  | 'gpt-4'
  | 'claude-3-opus-20240229'
  | 'gemini-1.5-pro';

export interface CommonLogData {
  requestStartTime: number;
  provider: VALID_PROVIDERS | null;
  model: VALID_MODELS | null;
  tokens_used: number;
  cost: number;
  RawRequest: string;
  RawResponse?: string;
  errorMessage?: string;
}

interface InternalLogData {
  id: string;
  timestamp: string;
  latency: bigint;
  provider: string;
  model: string;
  tokens_used: bigint;
  cost: number;
  raw_request: string;
  raw_response?: string;
  error_message?: string;
}

const s3 = new S3Client({ region: process.env.AWS_REGION });
const LOG_BUCKET = process.env.LOG_BUCKET_NAME;

if (!LOG_BUCKET) {
  throw new Error('LOG_BUCKET_NAME environment variable is required');
}

// Optional: Suppress Buffer() deprecation warning
process.on('warning', (warning) => {
  if (warning.name !== 'DeprecationWarning') {
    console.warn(warning);
  }
});

const saveLogToS3 = async (
  log: CommonLogData,
  status: 'success' | 'failure'
) => {
  try {
    const now = new Date();
    const timestamp = now.toISOString();
    const latency = BigInt(Date.now() - log.requestStartTime);
    const date = timestamp.split('T')[0];
    const provider = log.provider ?? 'unknown';
    const model = log.model ?? 'unknown';
    const id = uuidv4();

    const structuredLog: InternalLogData = {
      id,
      timestamp,
      latency,
      provider,
      model,
      tokens_used: BigInt(log.tokens_used),
      cost: log.cost,
      raw_request: log.RawRequest,
      raw_response: log.RawResponse,
      error_message: log.errorMessage,
    };

    const schema = new parquets.ParquetSchema({
      id: { type: 'UTF8' },
      timestamp: { type: 'UTF8' },
      latency: { type: 'INT64' },
      provider: { type: 'UTF8' },
      model: { type: 'UTF8' },
      tokens_used: { type: 'INT64' },
      cost: { type: 'DOUBLE' },
      raw_request: { type: 'UTF8' },
      raw_response: { type: 'UTF8', optional: true },
      error_message: { type: 'UTF8', optional: true },
    });

    const tmpFilePath = path.join(os.tmpdir(), `${id}.parquet`);

    const writer = await parquets.ParquetWriter.openFile(schema, tmpFilePath);
    await writer.appendRow(structuredLog);
    await writer.close();

    const buffer = await readFile(tmpFilePath);
    await unlink(tmpFilePath); // Clean up

    const key = `logs/parquet/status=${status}/date=${date}/provider=${provider}/model=${model}/${id}.parquet`;

    await s3.send(
      new PutObjectCommand({
        Bucket: LOG_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: 'application/octet-stream',
      })
    );
  } catch (err) {
    console.error('[LogError] Failed to write log to S3:', err);
  }
};

export const logSuccessfulRequest = async (
  logData: CommonLogData & { RawResponse: string }
) => {
  console.log('[Success]', logData);
  await saveLogToS3(logData, 'success');
};

export const logFailedRequest = async (
  logData: CommonLogData & { errorMessage: string }
) => {
  console.error('[Failure]', logData);
  await saveLogToS3(logData, 'failure');
};
