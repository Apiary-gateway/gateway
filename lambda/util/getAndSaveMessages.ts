import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { InternalMessage } from './types';

const dynamoClient = new DynamoDBClient({});

export async function getMessageHistory(threadID: string): Promise<InternalMessage[]> {

    const command = new QueryCommand({
        TableName: process.env.MESSAGE_TABLE_NAME,
        KeyConditionExpression: 'threadID = :threadID',
        ExpressionAttributeValues: {
            ':threadID': { S: threadID },
        },
        ExpressionAttributeNames: {
            '#r': 'role',
            '#c': 'content',
        },
        ProjectionExpression: '#r, #c',
        ScanIndexForward: true,
    });

    try {
        const result = await dynamoClient.send(command);
        return result.Items?.map(item => unmarshall(item) as InternalMessage) || [];
    } catch (error) {
        console.log('Error getting message history: ', error)
        throw error;
    }

}

export async function saveMessage(message: Omit<InternalMessage, 'timestamp'>) {
    const timestamp = Date.now();
    const item: InternalMessage = { ...message, timestamp };

    const command = new PutItemCommand({
        TableName: process.env.MESSAGE_TABLE_NAME,
        Item: marshall(item),
    });

    try {
        await dynamoClient.send(command);
    } catch (error) {
        console.log('Error saving message: ', error)
        throw error;
    }
    
}

export async function saveMessages(userPrompt: string, assistantResponse: string, threadID: string) {
    const userMessage: Omit<InternalMessage, 'timestamp'> = {
        threadID: threadID,
        role: 'user',
        content: userPrompt,
    }

    const assistantMessage: Omit<InternalMessage, 'timestamp'> = {
        threadID: threadID,
        role: 'assistant',
        content: assistantResponse,
    }

    await saveMessage(userMessage);
    await saveMessage(assistantMessage);
}

