import { z } from 'zod';

const operatorEnum = z.enum([
    'equals',
    'notEquals',
    'in',
    'contains',
    'lessThan',
    'greaterThan',
]);

export const providerModelSchema = z.object({
    provider: z.string(),
    model: z.string(),
  });

export const weightedProviderModelSchema = providerModelSchema.extend({
    weight: z.number().min(0).max(1),
});

const routingConditionMatch = z.object({
    field: z.string(),
    operator: operatorEnum,
    value: z.string(),
});

export const routingConditionSchema = z.object({
  name: z.string(),
  match: routingConditionMatch, 
  loadBalance: z.array(weightedProviderModelSchema),
  fallbackModel: z.optional(providerModelSchema),
});

export const routingSchema = z.object({
  defaultModel: providerModelSchema,
  enableFallbacks: z.boolean(),
  fallbackModel: providerModelSchema,
  retries: z.number(),
  availableMetadata: z.array(z.string()),
  fallbackOnStatus: z.array(z.number()).optional(),
  conditions: z.array(routingConditionSchema).optional(),
});

export const guardrailsSchema = z.object({
  enabled: z.boolean(),
  threshold: z
    .number()
    .min(0, 'Must be between 0 and 1')
    .max(1, 'Must be between 0 and 1'),
  restrictedWords: z.array(z.string()),
  sensitivityLevel: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  resendOnViolation: z.boolean(),
  blockedContentResponse: z.string(),
});

export const cacheSchema = z.object({
  enableSimple: z.boolean(),
  enableSemantic: z.boolean(),
  semanticCacheThreshold: z
    .number()
    .min(0, 'Must be between 0 and 1')
    .max(1, 'Must be between 0 and 1'),
});

export const configSchema = z.object({
  routing: routingSchema,
  guardrails: guardrailsSchema,
  cache: cacheSchema,
  systemPrompt: z.string(),
});

export const presignedUrlSchema = z.object({
    url: z.string(),
})

export type Config = z.infer<typeof configSchema>;
export type PresignedUrl = z.infer<typeof presignedUrlSchema>;
