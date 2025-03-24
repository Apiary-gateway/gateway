import OpenAI from 'openai';
import { InternalMessage } from './types';
import { SYSTEM_PROMPT } from './constants';

const openaiApiKey = process.env.OPENAI_API_KEY;

export default async function callOpenAI(history: InternalMessage[], prompt: string) {
    try {
        const openai = new OpenAI({ apiKey: openaiApiKey });

        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: process.env.SYSTEM_PROMPT || SYSTEM_PROMPT },
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
        console.error('Error in OpenAI call:', error);
        throw error;
    }
}