import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { getAuthenticatedUserId } from '@libs/auth';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { getBatchTranscriptionJob } from '@libs/speechmatics';
import {
  getTranscriptionForUser,
  listTranscriptionsForUser,
  type TranscriptionRecord,
  updateTranscriptionForUser,
} from '@libs/transcriptions';

const mapHistoryItem = (item: {
  transcriptionId: string;
  filename: string;
  status: string;
  audioKey?: string;
  createdAt: string;
}) => ({
  transcriptionId: item.transcriptionId,
  filename: item.filename,
  status: item.status,
  audioKey: item.audioKey,
  createdAt: item.createdAt,
});

const syncProcessingRecord = async (item: TranscriptionRecord) => {
  if (item.status !== 'processing' || !item.speechmaticsJobId) {
    return item;
  }

  try {
    const job = await getBatchTranscriptionJob(item.speechmaticsJobId);

    if (job.status === 'running') {
      return item;
    }

    const updatedAt = new Date().toISOString();

    if (job.status === 'done') {
      await updateTranscriptionForUser(item.userId, item.transcriptionId, {
        status: 'completed',
        completedAt: updatedAt,
        updatedAt,
        errorMessage: undefined,
      });

      return {
        ...item,
        status: 'completed',
        completedAt: updatedAt,
        updatedAt,
        errorMessage: undefined,
      };
    }

    const errorMessage = job.errorMessage ?? `Speechmatics job ${job.status}.`;

    await updateTranscriptionForUser(item.userId, item.transcriptionId, {
      status: 'failed',
      updatedAt,
      errorMessage,
    });

    return {
      ...item,
      status: 'failed',
      updatedAt,
      errorMessage,
    };
  } catch (error) {
    console.error('Failed to sync transcription status from Speechmatics.', {
      transcriptionId: item.transcriptionId,
      speechmaticsJobId: item.speechmaticsJobId,
      error,
    });

    return item;
  }
};

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

    const syncedItem = await syncProcessingRecord(item);

    return formatJSONResponse({
      item: mapHistoryItem(syncedItem),
    });
  }

  const cursor = event.queryStringParameters?.cursor;
  const requestedLimit = Number.parseInt(event.queryStringParameters?.limit ?? '10', 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 25)
    : 10;

  const result = await listTranscriptionsForUser(userId, cursor, limit);
  const syncedItems = await Promise.all(result.items.map(syncProcessingRecord));

  return formatJSONResponse({
    items: syncedItems.map(mapHistoryItem),
    nextCursor: result.nextCursor,
  });
};

export const main = middyfy(history);
