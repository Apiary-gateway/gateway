export type InternalMessage = {
    threadID?: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp?: number;
}
