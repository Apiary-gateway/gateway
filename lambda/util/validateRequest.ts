import { FullRequestSchema, RequestBodySchema } from './schemas/requestSchema';
import { z } from 'zod';

type ValidationResult =
  | {
      success: true;
      data: z.infer<typeof RequestBodySchema>;
    }
  | {
      success: false;
      error: string;
    };

export function validateRequest(event: unknown): ValidationResult {
    const result = FullRequestSchema.safeParse(event);
    if (!result.success) {
        return { success: false, error: 'Invalid request format' };
    }

    let parsedBody: unknown;

    try {
        parsedBody = typeof result.data.body === 'string' ? JSON.parse(result.data.body) : result.data.body;
    } catch (error) {
        return { success: false, error: 'Invalid request body' };
    }

    const parsed = RequestBodySchema.safeParse(parsedBody);

    if (!parsed.success) {
        return { success: false, error: parsed.error.message };
    }

    return { success: true, data: parsed.data };
}

export function requestIsValid(event: unknown): event is { headers: Record<string, string>; body: z.infer<typeof RequestBodySchema> } {
    return validateRequest(event).success;
}

