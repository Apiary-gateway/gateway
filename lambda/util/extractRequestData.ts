import { getConfig } from './getConfig';
import { RequestPayload } from './schemas/requestSchema';
import { ParsedRequestData, RequestMetadata } from './types';
import { requestIsValid } from './validateRequest';
import { v4 as uuidv4 } from 'uuid';

export function extractRequestData(parsed: RequestPayload): ParsedRequestData {
  return {
    threadID: parsed.threadID || uuidv4(),
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
    const config = getConfig();

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


