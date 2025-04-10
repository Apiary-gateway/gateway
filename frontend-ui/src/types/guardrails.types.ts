import { z } from 'zod';

export const SingleGuardrailSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export type Guardrail = z.infer<typeof SingleGuardrailSchema>;

export const GetGuardrailsResponseSchema = z.array(SingleGuardrailSchema);
