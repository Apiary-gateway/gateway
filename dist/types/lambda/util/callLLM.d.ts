import { CallLLMArgs, CallLLMResponse } from './types';
import { CompletionResponse } from 'token.js';
export default function callLLM({ history, prompt, provider, model, log, userId }: CallLLMArgs): Promise<CallLLMResponse>;
export declare function callLLMWithGuardrail({ history, prompt, provider, model, log, userId, llmResponse, match, embeddedPrompt }: CallLLMArgs & {
    llmResponse: string;
    match: string;
    embeddedPrompt: number[];
}): Promise<{
    text: string;
    usage: CompletionResponse["usage"];
}>;
