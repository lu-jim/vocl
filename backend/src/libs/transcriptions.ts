import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
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
  audioKey?: string;
  createdAt: string;
  updatedAt: string;
  speechmaticsJobId?: string;
  language?: string;
  transcriptKey?: string;
  completedAt?: string;
  errorMessage?: string;
};

const getTableName = () => {
  const tableName = process.env.TRANSCRIPTIONS_TABLE_NAME;

  if (!tableName) {
    throw new Error('Transcriptions table configuration is missing.');
  }

  return tableName;
};

export const createTranscriptionRecord = async (record: TranscriptionRecord) => {
  await documentClient.send(
    new PutCommand({
      TableName: getTableName(),
      Item: record,
    })
  );
};

export const createUploadRecord = createTranscriptionRecord;

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

export const updateTranscriptionForUser = async (
  userId: string,
  transcriptionId: string,
  updates: Partial<Omit<TranscriptionRecord, 'userId' | 'transcriptionId' | 'createdAt'>>
) => {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return;
  }

  const updateExpressionParts: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  entries.forEach(([key, value], index) => {
    const nameKey = `#field${index}`;
    const valueKey = `:value${index}`;
    updateExpressionParts.push(`${nameKey} = ${valueKey}`);
    expressionAttributeNames[nameKey] = key;
    expressionAttributeValues[valueKey] = value;
  });

  await documentClient.send(
    new UpdateCommand({
      TableName: getTableName(),
      Key: {
        userId,
        transcriptionId,
      },
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );
};
