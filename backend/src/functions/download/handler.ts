import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { getAuthenticatedUserId } from '@libs/auth';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { getBatchTranscriptionTranscript } from '@libs/speechmatics';
import { getTranscriptionForUser } from '@libs/transcriptions';

const getTranscriptFilename = (filename: string) => {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const lastDotIndex = sanitized.lastIndexOf('.');
  const basename = lastDotIndex > 0 ? sanitized.slice(0, lastDotIndex) : sanitized;

  return `${basename || 'transcript'}.txt`;
};

const download = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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

  if (!transcriptionId) {
    return formatJSONResponse(
      {
        message: 'Transcription id is required.',
      },
      { statusCode: 400 }
    );
  }

  const record = await getTranscriptionForUser(userId, transcriptionId);

  if (!record) {
    return formatJSONResponse(
      {
        message: 'Transcription not found.',
      },
      { statusCode: 404 }
    );
  }

  if (record.status !== 'completed' || !record.speechmaticsJobId) {
    return formatJSONResponse(
      {
        message: 'Transcript is not ready yet.',
      },
      { statusCode: 409 }
    );
  }

  try {
    const transcript = await getBatchTranscriptionTranscript(record.speechmaticsJobId, 'txt');
    const disposition = event.queryStringParameters?.disposition === 'inline' ? 'inline' : 'attachment';

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `${disposition}; filename="${getTranscriptFilename(record.filename)}"`,
      },
      body: transcript,
    };
  } catch (error) {
    return formatJSONResponse(
      {
        message: error instanceof Error ? error.message : 'Could not load the transcript.',
      },
      { statusCode: 502 }
    );
  }
};

export const main = middyfy(download);
