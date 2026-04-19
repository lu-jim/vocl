import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ulid } from 'ulid';
import { getAuthenticatedUserId } from '@libs/auth';
import { formatJSONResponse, type ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { createTranscriptionRecord } from '@libs/transcriptions';

import schema from './schema';

const s3Client = new S3Client({});

const DEFAULT_TRANSCRIPT_TITLE = 'live-transcript';

const sanitizeTitle = (value?: string) => {
  const base = value?.trim() || DEFAULT_TRANSCRIPT_TITLE;

  return (
    base
      .toLowerCase()
      .replace(/\.txt$/i, '')
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || DEFAULT_TRANSCRIPT_TITLE
  );
};

const realtimeSave: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const userId = getAuthenticatedUserId(event);
  const bucketName = process.env.AUDIO_BUCKET_NAME;
  const body = event.body;

  if (!userId) {
    return formatJSONResponse(
      {
        message: 'Authentication is required.',
      },
      { statusCode: 401 }
    );
  }

  if (!bucketName) {
    return formatJSONResponse(
      {
        message: 'Transcript storage is not configured.',
      },
      { statusCode: 500 }
    );
  }

  if (!body || typeof body !== 'object') {
    return formatJSONResponse(
      {
        message: 'Invalid realtime save request body.',
      },
      { statusCode: 400 }
    );
  }

  const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';
  const language = typeof body.language === 'string' ? body.language.trim() : undefined;

  if (!transcript) {
    return formatJSONResponse(
      {
        message: 'Transcript text is required.',
      },
      { statusCode: 400 }
    );
  }

  const transcriptionId = ulid();
  const now = new Date().toISOString();
  const filename = `${sanitizeTitle(typeof body.title === 'string' ? body.title : undefined)}.txt`;
  const transcriptKey = `transcripts/${userId}/${transcriptionId}/${filename}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: transcriptKey,
      Body: transcript,
      ContentType: 'text/plain; charset=utf-8',
    })
  );

  await createTranscriptionRecord({
    userId,
    transcriptionId,
    filename,
    contentType: 'text/plain',
    size: Buffer.byteLength(transcript, 'utf8'),
    status: 'completed',
    transcriptKey,
    language,
    createdAt: now,
    updatedAt: now,
    completedAt: now,
  });

  return formatJSONResponse(
    {
      message: 'Live transcript saved.',
      transcriptionId,
      transcriptKey,
      filename,
      status: 'completed',
    },
    { statusCode: 201 }
  );
};

export const main = middyfy(realtimeSave);
