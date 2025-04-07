import { config } from './config/config';
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
    const metadata: RequestMetadata = {};

    try {
      for (const field of config.routing.availableMetadata || []) {
        const headerKey = `x-${field.toLowerCase()}`;
        metadata[field] = event.headers?.[headerKey];
      }
      return metadata;
    } catch (error) {
    console.error('Error extracting request metadata:', error);
    return {};
  }
}


