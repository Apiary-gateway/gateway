import { RequestPayload } from './schemas/requestSchema';
import { ParsedRequestData, RequestMetadata } from './types';
export declare function extractRequestData(parsed: RequestPayload): ParsedRequestData;
export declare function extractRequestMetadata(event: unknown, parsed: RequestPayload): RequestMetadata;
