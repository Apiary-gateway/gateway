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

    const result = await dynamoClient.send(command);
    return result.Items?.map(item => unmarshall(item) as InternalMessage) || [];
}

export async function saveMessage(message: Omit<InternalMessage, 'timestamp'>) {
    const timestamp = Date.now();
    const item: InternalMessage = { ...message, timestamp };

    const command = new PutItemCommand({
        TableName: process.env.MESSAGE_TABLE_NAME,
        Item: marshall(item),
    });

    await dynamoClient.send(command);
}

