import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { getAuthenticatedUserId } from '@libs/auth';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { getTranscriptionForUser, listTranscriptionsForUser } from '@libs/transcriptions';

const mapHistoryItem = (item: {
  transcriptionId: string;
  filename: string;
  status: string;
  audioKey: string;
  createdAt: string;
}) => ({
  transcriptionId: item.transcriptionId,
  filename: item.filename,
  status: item.status,
  audioKey: item.audioKey,
  createdAt: item.createdAt,
});

const history = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = getAuthenticatedUserId(event);

  if (!userId) {
    return formatJSONResponse(
      {
        message: 'Authentication is required.',
      },
      { statusCode: 401 }
    );
  }

  const transcriptionId = event.pathParameters?.id;

  if (transcriptionId) {
    const item = await getTranscriptionForUser(userId, transcriptionId);

    if (!item) {
      return formatJSONResponse(
        {
          message: 'Transcription not found.',
        },
        { statusCode: 404 }
      );
    }

    return formatJSONResponse({
      item: mapHistoryItem(item),
    });
  }

  const cursor = event.queryStringParameters?.cursor;
  const requestedLimit = Number.parseInt(event.queryStringParameters?.limit ?? '10', 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 25)
    : 10;

  const result = await listTranscriptionsForUser(userId, cursor, limit);

  return formatJSONResponse({
    items: result.items.map(mapHistoryItem),
    nextCursor: result.nextCursor,
  });
};

export const main = middyfy(history);
