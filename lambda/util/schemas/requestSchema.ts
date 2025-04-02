import { z } from 'zod';
import { MODELS } from '../constants';
import { isValidModelForProvider } from '../modelValidation';

const providers = Object.keys(MODELS) as ['openai', 'anthropic', 'gemini']; // zod requires a tuple with at least one string element in its enum() function
const models = Object.values(MODELS).flat() as ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o-mini', 'claude-3-opus-20240229', 'claude-3-5-haiku-20241022', 'gemini-1.5-pro', 'gemini-2.0-flash-001'];

export const FullRequestSchema = z.object({
    headers: z.record(z.string()),
    body: z.union([z.string(), z.record(z.unknown())]),
});

export const RequestBodySchema = z
  .object({
    prompt: z.string().min(1),
    threadID: z.string().optional(),
    provider: z.enum(providers).optional(),
    model: z.enum(models).optional(), 
    userType: z.string().optional(),
    region: z.string().optional(),
    userId: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const { provider, model } = data;
    if (model && !provider) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Provider is required when model is specified',
            path: ['model'],
        });
        return;
    }

    if (model && provider && !isValidModelForProvider(provider, model)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid model for provider ${provider}`,
            path: ['model'],
        });
        return;
            
    }
  });

export type RequestPayload = z.infer<typeof RequestBodySchema>;