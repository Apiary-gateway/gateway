import Anthropic from '@anthropic-ai/sdk';
import { InternalMessage } from './types';
import { SYSTEM_PROMPT } from './constants';

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

export default async function callAnthropic(history: InternalMessage[], prompt: string) {
    try {
        const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    
        const response = await anthropic.messages.create({
            model: 'claude-3-opus-20240229',
            system: process.env.SYSTEM_PROMPT || SYSTEM_PROMPT,
            messages: [
                ...history,
                {
                    role: 'user',
                    content: prompt,
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        });
    
        return response;
    } catch (error) {
        console.error('Error in Anthropic call:', error);
        throw error;
    }
}