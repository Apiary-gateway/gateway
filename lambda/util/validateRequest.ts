import { FullRequestSchema, RequestBodySchema, RequestPayload } from './schemas/requestSchema';

export function validateRequest(event: unknown) {
    const fullParse = FullRequestSchema.safeParse(event);
    if (!fullParse.success) {
        console.log('Invalid request format:', fullParse.error);
        throw new Error('Invalid request format')
    }

    let parsedBody: unknown;

    try {
        parsedBody = typeof fullParse.data.body === 'string' ? JSON.parse(fullParse.data.body) : fullParse.data.body;
    } catch (error) {
        console.log('Error parsing request body:', error);
        throw new Error('Error parsing request body');
    }

    const body = RequestBodySchema.safeParse(parsedBody);

    if (!body.success) {
        console.log('Validation error:', body.error.format())
        throw new Error('Request validation error');
    }

    return body.data;
}

export function requestIsValid(event: unknown): event is { headers: Record<string, string>; body: RequestPayload } {
    try {
        validateRequest(event);
        return true;
    } catch {
        return false;
    }
}

