import { z } from 'zod';

export const providerModelSchema = z.object({
    provider: z.string(),
    model: z.string(),
  });

  export const weightedProviderModelSchema = providerModelSchema.extend({
    weight: z.number(),
  });

export const routingConditionSchema = z.object({
  name: z.string(),
  query: z.any(), 
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
  threshold: z.number(),
  restrictedWords: z.array(z.string()),
  sensitivityLevel: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  resendOnViolation: z.boolean(),
  blockedContentResponse: z.string(),
});

export const cacheSchema = z.object({
  enableSimple: z.boolean(),
  enableSemantic: z.boolean(),
  semanticCacheThreshold: z.number(),
});

export const configSchema = z.object({
  routing: routingSchema,
  guardrails: guardrailsSchema,
  cache: cacheSchema,
});

export type Config = z.infer<typeof configSchema>;
