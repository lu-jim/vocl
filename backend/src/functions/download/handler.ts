import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { getAuthenticatedUserId } from '@libs/auth';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { getBatchTranscriptionTranscript } from '@libs/speechmatics';
import { getTranscriptionForUser } from '@libs/transcriptions';

const s3Client = new S3Client({});

const getTranscriptFilename = (filename: string) => {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const lastDotIndex = sanitized.lastIndexOf('.');
  const basename = lastDotIndex > 0 ? sanitized.slice(0, lastDotIndex) : sanitized;

  return `${basename || 'transcript'}.txt`;
};

const getSavedTranscript = async (bucketName: string, transcriptKey: string) => {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: transcriptKey,
    })
  );

  if (!response.Body) {
    throw new Error('Saved transcript could not be loaded.');
  }

  return response.Body.transformToString();
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

  if (record.status !== 'completed') {
    return formatJSONResponse(
      {
        message: 'Transcript is not ready yet.',
      },
      { statusCode: 409 }
    );
  }

  try {
    const transcript =
      record.transcriptKey && process.env.AUDIO_BUCKET_NAME
        ? await getSavedTranscript(process.env.AUDIO_BUCKET_NAME, record.transcriptKey)
        : record.speechmaticsJobId
          ? await getBatchTranscriptionTranscript(record.speechmaticsJobId, 'txt')
          : null;

    if (!transcript) {
      return formatJSONResponse(
        {
          message: 'Transcript is not ready yet.',
        },
        { statusCode: 409 }
      );
    }

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
