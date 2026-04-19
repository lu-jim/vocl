import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(dynamoClient);

export type TranscriptionRecord = {
  userId: string;
  transcriptionId: string;
  filename: string;
  contentType: string;
  size: number;
  status: string;
  audioKey: string;
  createdAt: string;
  updatedAt: string;
};

const getTableName = () => {
  const tableName = process.env.TRANSCRIPTIONS_TABLE_NAME;

  if (!tableName) {
    throw new Error('Transcriptions table configuration is missing.');
  }

  return tableName;
};

export const createUploadRecord = async (record: TranscriptionRecord) => {
  await documentClient.send(
    new PutCommand({
      TableName: getTableName(),
      Item: record,
    })
  );
};

export const listTranscriptionsForUser = async (userId: string, cursor?: string, limit = 10) => {
  const result = await documentClient.send(
    new QueryCommand({
      TableName: getTableName(),
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ExclusiveStartKey: cursor
        ? {
            userId,
            transcriptionId: cursor,
          }
        : undefined,
      Limit: limit,
      ScanIndexForward: false,
    })
  );

  return {
    items: (result.Items as TranscriptionRecord[] | undefined) ?? [],
    nextCursor:
      typeof result.LastEvaluatedKey?.transcriptionId === 'string'
        ? result.LastEvaluatedKey.transcriptionId
        : null,
  };
};

export const getTranscriptionForUser = async (userId: string, transcriptionId: string) => {
  const result = await documentClient.send(
    new GetCommand({
      TableName: getTableName(),
      Key: {
        userId,
        transcriptionId,
      },
    })
  );

  return (result.Item as TranscriptionRecord | undefined) ?? null;
};
