export declare function getEmbedding(text: string): Promise<number[]>;
export declare function indexVector(index: string, document: object): Promise<any>;
export declare function searchKNN(index: string, embedding: number[], k?: number): Promise<{
    _score: number;
    _source: any;
}[]>;
export declare function createVectorIndex(index: string, dimension: number): Promise<any>;
export declare function signedPost(path: string, body: object): Promise<any>;
