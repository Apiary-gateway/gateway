import { z } from 'zod';
export declare const FullRequestSchema: z.ZodObject<{
    headers: z.ZodRecord<z.ZodString, z.ZodString>;
    body: z.ZodUnion<[z.ZodString, z.ZodRecord<z.ZodString, z.ZodUnknown>]>;
}, "strip", z.ZodTypeAny, {
    body: string | Record<string, unknown>;
    headers: Record<string, string>;
}, {
    body: string | Record<string, unknown>;
    headers: Record<string, string>;
}>;
export declare const RequestBodySchema: z.ZodEffects<z.ZodObject<{
    prompt: z.ZodString;
    threadID: z.ZodOptional<z.ZodString>;
    provider: z.ZodOptional<z.ZodEnum<["openai", "anthropic", "gemini"]>>;
    model: z.ZodOptional<z.ZodEnum<["gpt-3.5-turbo", "gpt-4", "gpt-4o-mini", "claude-3-opus-20240229", "claude-3-5-haiku-20241022", "gemini-1.5-pro", "gemini-2.0-flash-001"]>>;
    userType: z.ZodOptional<z.ZodString>;
    region: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    region?: string | undefined;
    threadID?: string | undefined;
    userId?: string | undefined;
    provider?: "openai" | "anthropic" | "gemini" | undefined;
    model?: "gpt-3.5-turbo" | "gpt-4" | "gpt-4o-mini" | "claude-3-opus-20240229" | "claude-3-5-haiku-20241022" | "gemini-1.5-pro" | "gemini-2.0-flash-001" | undefined;
    userType?: string | undefined;
}, {
    prompt: string;
    region?: string | undefined;
    threadID?: string | undefined;
    userId?: string | undefined;
    provider?: "openai" | "anthropic" | "gemini" | undefined;
    model?: "gpt-3.5-turbo" | "gpt-4" | "gpt-4o-mini" | "claude-3-opus-20240229" | "claude-3-5-haiku-20241022" | "gemini-1.5-pro" | "gemini-2.0-flash-001" | undefined;
    userType?: string | undefined;
}>, {
    prompt: string;
    region?: string | undefined;
    threadID?: string | undefined;
    userId?: string | undefined;
    provider?: "openai" | "anthropic" | "gemini" | undefined;
    model?: "gpt-3.5-turbo" | "gpt-4" | "gpt-4o-mini" | "claude-3-opus-20240229" | "claude-3-5-haiku-20241022" | "gemini-1.5-pro" | "gemini-2.0-flash-001" | undefined;
    userType?: string | undefined;
}, {
    prompt: string;
    region?: string | undefined;
    threadID?: string | undefined;
    userId?: string | undefined;
    provider?: "openai" | "anthropic" | "gemini" | undefined;
    model?: "gpt-3.5-turbo" | "gpt-4" | "gpt-4o-mini" | "claude-3-opus-20240229" | "claude-3-5-haiku-20241022" | "gemini-1.5-pro" | "gemini-2.0-flash-001" | undefined;
    userType?: string | undefined;
}>;
export type RequestPayload = z.infer<typeof RequestBodySchema>;
