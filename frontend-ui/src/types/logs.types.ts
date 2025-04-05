import { z } from 'zod';

export const LogEntrySchema = z.object({
  id: z.string().optional().nullable(),
  timestamp: z.string().optional().nullable(),
  latency: z.union([z.string(), z.number()]).optional().nullable(),
  is_successful: z.union([z.boolean(), z.string()]).optional().nullable(),
  success_reason: z.string().optional().nullable(),
  error_reason: z.string().optional().nullable(),
  model_routing_history: z
    .union([z.string(), z.array(z.any())])
    .optional()
    .nullable(),
  user_id: z.string().optional().nullable(),
  metadata: z.string().optional().nullable(),
  thread_id: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  cost: z.union([z.string(), z.number()]).optional().nullable(),
  raw_request: z.string().optional().nullable(),
  raw_response: z.string().optional().nullable(),
  error_message: z.string().optional().nullable(),
});

export type LogEntry = z.infer<typeof LogEntrySchema>;

const LogResponseBodySchema = z.object({
  logs: z.array(LogEntrySchema),
  page: z.number(),
  pageSize: z.number(),
  nextToken: z.string().optional().nullable(),
});

export type LogResponseBody = z.infer<typeof LogResponseBodySchema>;

// Transform `body` string → parsed JSON → validate with LogResponseBodySchema
export const LogsResponseSchema = z.object({
  statusCode: z.number(),
  body: z
    .string()
    .transform((val) => {
      try {
        return JSON.parse(val);
      } catch (err) {
        alert('Could not parse request from /logs');
        throw new Error();
      }
    })
    .pipe(LogResponseBodySchema),
});
