import { z } from 'zod';
import { isValidModelForProvider } from '../modelValidation';
import { providerNames, modelNames } from '../constants';

export const FullRequestSchema = z.object({
    headers: z.record(z.string()),
    body: z.union([z.string(), z.record(z.unknown())]),
});

export const RequestBodySchema = z
  .object({
    prompt: z.string().min(1),
    threadID: z.string().optional(),
    provider: z.enum(providerNames).optional(),
    model: z.enum(modelNames).optional(), 
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