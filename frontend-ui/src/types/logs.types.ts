import { z } from 'zod';

// Schema for `prompt_tokens_details` and `completion_tokens_details` inside `usage`
// const TokenDetailsSchema = z.object({
//   cached_tokens: z.number(),
//   audio_tokens: z.number(),
// });

// const CompletionTokenDetailsSchema = z.object({
//   reasoning_tokens: z.number(),
//   audio_tokens: z.number(),
//   accepted_prediction_tokens: z.number(),
//   rejected_prediction_tokens: z.number(),
// });

// Schema for `usage` inside `raw_response`
const UsageSchema = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
  // prompt_tokens_details: TokenDetailsSchema,
  // completion_tokens_details: CompletionTokenDetailsSchema,
});

// Schema for `raw_response`
const RawResponseSchema = z.object({
  text: z.string(),
  usage: UsageSchema,
  provider: z.string(),
  model: z.string(),
});

// Schema for `body` inside `raw_request`
const RequestBodySchema = z.object({
  prompt: z.string(),
  provider: z.string(),
  model: z.string(),
});

// Schema for `identity` inside `requestContext`
// const IdentitySchema = z.object({
//   cognitoIdentityPoolId: z.string().nullable(),
//   cognitoIdentityId: z.string().nullable(),
//   apiKey: z.string(),
//   principalOrgId: z.string().nullable(),
//   cognitoAuthenticationType: z.string().nullable(),
//   userArn: z.string().nullable(),
//   apiKeyId: z.string(),
//   userAgent: z.string(),
//   accountId: z.string().nullable(),
//   caller: z.string().nullable(),
//   sourceIp: z.string(),
//   accessKey: z.string().nullable(),
//   cognitoAuthenticationProvider: z.string().nullable(),
//   user: z.string().nullable(),
// });

// Schema for `requestContext` inside `raw_request`
// const RequestContextSchema = z.object({
//   resourceId: z.string(),
//   resourcePath: z.string(),
//   httpMethod: z.string(),
//   extendedRequestId: z.string(),
//   requestTime: z.string(),
//   path: z.string(),
//   accountId: z.string(),
//   protocol: z.string(),
//   stage: z.string(),
//   domainPrefix: z.string(),
//   requestTimeEpoch: z.number(),
//   requestId: z.string(),
//   identity: IdentitySchema,
//   domainName: z.string(),
//   deploymentId: z.string(),
//   apiId: z.string(),
// });

// Schema for `raw_request`
const RawRequestSchema = z.object({
  resource: z.string(),
  path: z.string(),
  httpMethod: z.string(),
  headers: z.record(z.string(), z.string()),
  multiValueHeaders: z.record(z.string(), z.array(z.string())),
  queryStringParameters: z.record(z.string(), z.string()).nullable(),
  multiValueQueryStringParameters: z
    .record(z.string(), z.array(z.string()))
    .nullable(),
  pathParameters: z.record(z.string(), z.string()).nullable(),
  stageVariables: z.record(z.string(), z.string()).nullable(),
  // requestContext: RequestContextSchema,
  body: z.string().transform((str) => RequestBodySchema.parse(JSON.parse(str))),
  isBase64Encoded: z.boolean(),
});

// Schema for each log entry
const LogEntrySchema = z.object({
  id: z.string(),
  thread_ts: z.string(),
  timestamp: z.string(),
  latency: z.string().transform((str) => Number(str)),
  provider: z.string(),
  model: z.string(),
  tokens_used: z.string().transform((str) => Number(str)),
  cost: z.string().transform((str) => Number(str)),
  raw_request: z
    .string()
    .transform((str) => RawRequestSchema.parse(JSON.parse(str))),
  raw_response: z
    .string()
    .nullable()
    .transform((str) =>
      str ? RawResponseSchema.parse(JSON.parse(str)) : null
    ),
  error_message: z.string().nullable(),
  status: z.string(),
});

export type LogEntry = z.infer<typeof LogEntrySchema>;

// Schema for the inner logs response (previously the top-level schema)
const LogsResponseSchema = z.object({
  logs: z.array(LogEntrySchema),
  page: z.number(),
  pageSize: z.number(),
  nextToken: z.string().nullable(),
});

// Schema for the outer API response
export const GetLogsResponseSchema = z.object({
  statusCode: z.number(),
  body: z
    .string()
    .transform((str) => LogsResponseSchema.parse(JSON.parse(str))),
});

// Type inference
export type LogsResponse = z.infer<typeof LogsResponseSchema>;
export type GetLogsResponse = z.infer<typeof GetLogsResponseSchema>;
