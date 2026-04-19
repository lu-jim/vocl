import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { getAuthenticatedUserId } from '@libs/auth';
import { formatJSONResponse, type ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { submitBatchTranscription } from '@libs/speechmatics';
import { getTranscriptionForUser, updateTranscriptionForUser } from '@libs/transcriptions';

import schema from './schema';

const s3Client = new S3Client({});
const PRESIGNED_DOWNLOAD_TTL_SECONDS = 60 * 60;

const getTranscriptionStartError = (error: unknown) => {
  if (error instanceof Error) {
    if (error.message === 'Speechmatics API key is missing.') {
      return {
        statusCode: 500,
        message: 'Transcription service is not configured.',
      };
    }

    return {
      statusCode: 502,
      message: error.message,
    };
  }

  return {
    statusCode: 502,
    message: 'Could not start the transcription job.',
  };
};

const transcribe: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const userId = getAuthenticatedUserId(event);
  const bucketName = process.env.AUDIO_BUCKET_NAME;

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
        message: 'Transcription configuration is missing.',
      },
      { statusCode: 500 }
    );
  }

  const transcriptionId = event.body?.transcriptionId;

  if (!transcriptionId) {
    return formatJSONResponse(
      {
        message: 'transcriptionId is required.',
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

  if (record.status === 'processing' || record.status === 'completed') {
    return formatJSONResponse(
      {
        message: 'This transcription is already being processed.',
      },
      { statusCode: 409 }
    );
  }

  try {
    const audioFetchUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: record.audioKey,
      }),
      {
        expiresIn: PRESIGNED_DOWNLOAD_TTL_SECONDS,
      }
    );

    const language = event.body.language ?? record.language ?? 'en';
    const job = await submitBatchTranscription({
      fetchUrl: audioFetchUrl,
      transcriptionId: record.transcriptionId,
      filename: record.filename,
      language,
    });

    await updateTranscriptionForUser(userId, transcriptionId, {
      status: 'processing',
      speechmaticsJobId: job.id,
      language,
      updatedAt: new Date().toISOString(),
    });

    return formatJSONResponse({
      message: 'Transcription job started.',
      transcriptionId,
      status: 'processing',
      speechmaticsJobId: job.id,
    });
  } catch (error) {
    console.error('Failed to start transcription job.', {
      transcriptionId,
      userId,
      error,
    });

    const response = getTranscriptionStartError(error);

    return formatJSONResponse(
      {
        message: response.message,
      },
      { statusCode: response.statusCode }
    );
  }
};

export const main = middyfy(transcribe);
