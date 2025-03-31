import { RequestSchema } from './schemas/requestSchema';

export function validateRequest(event: any) {
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  return RequestSchema.safeParse(body);
}