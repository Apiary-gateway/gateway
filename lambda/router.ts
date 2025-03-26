import { z } from 'zod';
import callLLM from './util/callLLM';
import { saveMessage, getMessageHistory  } from './util/getAndSaveMessages';


const RequestSchema = z.object({ 
    prompt: z.string().min(1),
    threadID: z.string().optional(),
    provider: z.enum([ 'openai', 'anthropic', 'gemini' ]).optional(),
    model: z.enum([ 'gpt-3.5-turbo', 'gpt-4', 'claude-3-opus-20240229', 'gemini-1.5-pro']).optional(),
})

type RequestPayload = z.infer<typeof RequestSchema>;

export const handler = async (event: any) => {
    try { 

        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const parsed = RequestSchema.safeParse(body);
        
        if (!parsed.success) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "Invalid request body.",
                    details: parsed.error.flatten(),
                }),
            };
        }

        const { prompt } = parsed.data;
        const threadID = parsed.data.threadID || Date.now().toString();
        let { provider, model } = parsed.data;
        const history = await getMessageHistory(threadID);

        if (!prompt) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "No prompt provided in the request body.",
                }),
            };
        }

        await saveMessage({
            threadID: threadID,
            role: 'user',
            content: prompt,
        })

        if (!provider) {
            provider = Math.random() < 0.5 ? 'openai' : 'anthropic';
        }

        const response = await callLLM(history, prompt, provider, model);

        await saveMessage({
            threadID: threadID,
            role: 'assistant',
            content: response.text,
        })

        return {
            statusCode: 200,
            body: JSON.stringify({
                threadID,
                provider,
                response,
            }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "An error occurred while processing the request.",
            }),
        };
    }
}








