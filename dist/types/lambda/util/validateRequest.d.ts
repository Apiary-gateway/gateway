import { RequestPayload } from './schemas/requestSchema';
export declare function validateRequest(event: unknown): {
    prompt: string;
    region?: string | undefined;
    threadID?: string | undefined;
    userId?: string | undefined;
    provider?: "openai" | "anthropic" | "gemini" | undefined;
    model?: "gpt-3.5-turbo" | "gpt-4" | "gpt-4o-mini" | "claude-3-opus-20240229" | "claude-3-5-haiku-20241022" | "gemini-1.5-pro" | "gemini-2.0-flash-001" | undefined;
    userType?: string | undefined;
};
export declare function requestIsValid(event: unknown): event is {
    headers: Record<string, string>;
    body: RequestPayload;
};
