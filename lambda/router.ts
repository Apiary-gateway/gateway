import { processRequest } from './util/processRequest';

export const handler = async (event: any) => {
    try {
        return await processRequest(event);
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "An error occurred while processing the request.",
            }),
        };
    }
}








