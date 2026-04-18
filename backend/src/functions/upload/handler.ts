import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { formatJSONResponse, type ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';

import schema from './schema';

const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
const PRESIGNED_URL_TTL_SECONDS = 15 * 60;
const ALLOWED_CONTENT_TYPE_PREFIXES = ['audio/'];
const s3Client = new S3Client({});

const sanitizeFilename = (filename: string) => {
  const basename = filename.split(/[\\/]/).pop()?.trim() ?? 'audio-file';
  const normalized = basename.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
  return normalized || 'audio-file';
};

const isSupportedAudioType = (contentType: string) => {
  return ALLOWED_CONTENT_TYPE_PREFIXES.some((prefix) => contentType.startsWith(prefix));
};

const upload: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const bucketName = process.env.AUDIO_BUCKET_NAME;

  if (!bucketName) {
    return formatJSONResponse(
      {
        message: 'Upload configuration is missing.',
      },
      { statusCode: 500 }
    );
  }

  const body = event.body;

  if (!body || typeof body !== 'object') {
    return formatJSONResponse(
      {
        message: 'Invalid upload request body.',
      },
      { statusCode: 400 }
    );
  }

  const filename = typeof body.filename === 'string' ? body.filename.trim() : '';
  const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : '';
  const size = typeof body.size === 'number' ? body.size : NaN;

  if (!filename || !contentType || !Number.isFinite(size)) {
    return formatJSONResponse(
      {
        message: 'filename, contentType, and size are required.',
      },
      { statusCode: 400 }
    );
  }

  if (size <= 0 || size > MAX_UPLOAD_SIZE_BYTES) {
    return formatJSONResponse(
      {
        message: `Audio uploads must be between 1 byte and ${MAX_UPLOAD_SIZE_BYTES} bytes.`,
      },
      { statusCode: 400 }
    );
  }

  if (!isSupportedAudioType(contentType)) {
    return formatJSONResponse(
      {
        message: 'Only audio file uploads are supported.',
      },
      { statusCode: 415 }
    );
  }

  const safeFilename = sanitizeFilename(filename);
  const objectKey = `uploads/${new Date().toISOString().slice(0, 10)}/${event.requestContext.requestId}-${safeFilename}`;
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: PRESIGNED_URL_TTL_SECONDS,
  });

  return formatJSONResponse({
    uploadUrl,
    uploadMethod: 'PUT',
    audioKey: objectKey,
    bucketName,
    expiresInSeconds: PRESIGNED_URL_TTL_SECONDS,
    maxUploadSizeBytes: MAX_UPLOAD_SIZE_BYTES,
    headers: {
      'Content-Type': contentType,
    },
  });
};

export const main = middyfy(upload);
