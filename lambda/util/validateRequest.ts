import { RequestBodySchema } from './schemas/requestSchema';
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
  if (typeof event !== 'object' || event === null || !('body' in event)) {
    return { success: false, error: 'Invalid request body' };
  }

  const parsed = RequestBodySchema.safeParse(event.body);

  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  return { success: true, data: parsed.data };
}
