export function getErrorStatusCode(error: unknown): number | undefined {
    if (error instanceof Error) {
        const statusCode = (error as any).statusCode;
        if (typeof statusCode === 'number') {
            return statusCode;
        }
    }

    return undefined;
}