export declare const handler: () => Promise<{
    message: string;
    totalItems?: undefined;
    partitions?: undefined;
} | {
    message: string;
    totalItems: number;
    partitions: number;
}>;
