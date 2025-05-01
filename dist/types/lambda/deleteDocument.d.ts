export declare const handler: (event: {
    documentId: string;
}) => Promise<{
    statusCode: number;
    message: string;
} | undefined>;
