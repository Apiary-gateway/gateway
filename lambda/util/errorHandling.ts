export function getErrorStatusCode(error: unknown): number | undefined {
    if (error instanceof Error) {
        const statusCode = (error as any).statusCode;
        if (typeof statusCode === 'number') {
            return statusCode;
        }
    }

    if (error instanceof Object && 'status' in error && typeof error.status === 'number') {
        return error.status;
    }

    return undefined;
}