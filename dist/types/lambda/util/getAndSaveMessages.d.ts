import { InternalMessage } from './types';
export declare function getMessageHistory(threadID: string): Promise<InternalMessage[]>;
export declare function saveMessage(message: Omit<InternalMessage, 'timestamp'>): Promise<void>;
export declare function saveMessages(userPrompt: string, assistantResponse: string, threadID: string): Promise<void>;
