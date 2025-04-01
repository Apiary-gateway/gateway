import { RequestPayload } from './schemas/requestSchema';
import { ParsedRequestData, RequestMetadata, SupportedLLMs } from './types';

export function extractRequestData(parsed: RequestPayload): ParsedRequestData {
  return {
    threadID: parsed.threadID || Date.now().toString(),
    prompt: parsed.prompt,
    provider: parsed.provider as SupportedLLMs | undefined,
    model: parsed.model,
  };
}

export function extractRequestMetadata(event: any, parsed: RequestPayload): RequestMetadata {
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

