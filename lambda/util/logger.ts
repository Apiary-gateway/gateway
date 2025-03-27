// util/logger.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

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

const s3 = new S3Client({ region: process.env.AWS_REGION });
const LOG_BUCKET = process.env.LOG_BUCKET_NAME!;
const LOG_PREFIX = 'logs/json';

const saveLogToS3 = async (
  log: CommonLogData,
  status: 'success' | 'failure'
) => {
  const timestamp = new Date().toISOString();
  const key = `${LOG_PREFIX}/${status}/${timestamp}_${uuidv4()}.json`;

  await s3.send(
    new PutObjectCommand({
      Bucket: LOG_BUCKET,
      Key: key,
      Body: JSON.stringify(log),
      ContentType: 'application/json',
    })
  );
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
