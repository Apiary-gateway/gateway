import { z } from 'zod';
import { MODELS } from '../constants';
import { isValidModelForProvider } from '../modelValidation';

const providers = Object.keys(MODELS) as [string, ...string[]]; // zod requires a tuple with at least one string element in its enum() function

export const RequestBodySchema = z
  .object({
    prompt: z.string().min(1),
    threadID: z.string().optional(),
    provider: z.enum(providers).optional(),
    model: z.string().optional(),
    userId: z.string().optional(),
    userType: z.string().optional(),
    region: z.string().optional(),
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