import { RequestPayload } from './schemas/requestSchema';
import { ParsedRequestData, RequestMetadata } from './types';
import { requestIsValid } from './validateRequest';

export function extractRequestData(parsed: RequestPayload): ParsedRequestData {
  return {
    threadID: parsed.threadID || Date.now().toString(),
    prompt: parsed.prompt,
    provider: parsed.provider || undefined,
    model: parsed.model,
    userId: parsed.userId || undefined,
  };
}

export function extractRequestMetadata(event: unknown, parsed: RequestPayload): RequestMetadata {
    if (!requestIsValid(event)) {
      console.error('Invalid request');
      return {};
    }

    try {
      return {
        userType: event.headers?.['x-user-type'] || parsed.userType,
        region: event.headers?.['x-region'] || parsed.region,
      };
    } catch (error) {
    console.error('Error extracting request metadata:', error);
    return {};
  }
}


