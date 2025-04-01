import { validateRequest } from "./validateRequest";
import { extractRequestData, extractRequestMetadata } from "./extractRequestData";
import { getMessageHistory, saveMessages } from "./getAndSaveMessages";
import { routeRequest } from "./routeRequest";
import { validateModel } from "./modelValidation";

export async function processRequest(event: any) {
    const parsed = validateRequest(event);
    if (!parsed.success) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "Invalid request body.",
                details: parsed.error.flatten(),
            }),
        }
    } 

    const payload = parsed.data;
    const { threadID, prompt, provider, model } = extractRequestData(payload);
    const metadata = extractRequestMetadata(event, payload);
    
    if (!prompt) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "No prompt provided in the request body." }),
        };
    }

    if (provider && model && !validateModel({ provider, model })) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Provider and model combination invalid. '})
        }
    }
    const history = await getMessageHistory(threadID);
    const response = await routeRequest({ history, prompt, provider, model, metadata });
    
    await saveMessages(prompt, response.text, threadID); 

    return {
        statusCode: 200,
        body: JSON.stringify({
            threadID,
            response,
        }),
    };
}
