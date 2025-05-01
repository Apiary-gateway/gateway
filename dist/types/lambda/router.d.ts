export declare const handler: (event: unknown) => Promise<{
    statusCode: number;
    headers: {
        'simple-cache': string;
        'semantic-cache': string;
    };
    body: string;
} | {
    statusCode: number;
    body: string;
    headers?: undefined;
}>;
