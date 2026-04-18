jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

jest.mock('@aws-sdk/client-s3', () => {
  class PutObjectCommand {
    input: Record<string, unknown>;

    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  return {
    S3Client: jest.fn(() => ({ mockClient: true })),
    PutObjectCommand,
  };
});

import { main } from '@functions/upload/handler';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { createApiGatewayEvent } from './event-factory';

describe('upload handler', () => {
  const mockedGetSignedUrl = jest.mocked(getSignedUrl);

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-18T09:30:00.000Z'));
    process.env.AUDIO_BUCKET_NAME = 'vocl-dev-audio-test';
    mockedGetSignedUrl.mockResolvedValue('https://signed.example/upload');
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.AUDIO_BUCKET_NAME;
    mockedGetSignedUrl.mockReset();
  });

  it('returns a presigned upload payload for valid audio uploads', async () => {
    const result = await main(
      createApiGatewayEvent({
        body: JSON.stringify({
          filename: 'meeting.mp3',
          contentType: 'audio/mpeg',
          size: 1024,
        }) as never,
        headers: {
          'Content-Type': 'application/json',
        },
        httpMethod: 'POST',
        path: '/upload',
        resource: '/upload',
        rawBody: JSON.stringify({
          filename: 'meeting.mp3',
          contentType: 'audio/mpeg',
          size: 1024,
        }),
        requestContext: {
          httpMethod: 'POST',
          path: '/upload',
          requestId: 'req-123',
          resourcePath: '/upload',
        } as never,
      }) as never,
      {} as never,
      () => undefined
    );

    expect(result).toBeDefined();
    expect(result?.statusCode).toBe(200);
    expect(result?.headers).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    expect(result?.body).toBe(
      JSON.stringify({
        uploadUrl: 'https://signed.example/upload',
        uploadMethod: 'PUT',
        audioKey: 'uploads/2026-04-18/req-123-meeting.mp3',
        bucketName: 'vocl-dev-audio-test',
        expiresInSeconds: 900,
        maxUploadSizeBytes: 20971520,
        headers: {
          'Content-Type': 'audio/mpeg',
        },
      })
    );
    expect(mockedGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('rejects files above the 20 MB limit', async () => {
    const result = await main(
      createApiGatewayEvent({
        body: JSON.stringify({
          filename: 'long-meeting.mp3',
          contentType: 'audio/mpeg',
          size: 20 * 1024 * 1024 + 1,
        }) as never,
        headers: {
          'Content-Type': 'application/json',
        },
        httpMethod: 'POST',
        path: '/upload',
        resource: '/upload',
        rawBody: JSON.stringify({
          filename: 'long-meeting.mp3',
          contentType: 'audio/mpeg',
          size: 20 * 1024 * 1024 + 1,
        }),
      }) as never,
      {} as never,
      () => undefined
    );

    expect(result?.statusCode).toBe(400);
    expect(result?.body).toBe(
      JSON.stringify({
        message: 'Audio uploads must be between 1 byte and 20971520 bytes.',
      })
    );
    expect(mockedGetSignedUrl).not.toHaveBeenCalled();
  });

  it('rejects unsupported content types', async () => {
    const result = await main(
      createApiGatewayEvent({
        body: JSON.stringify({
          filename: 'notes.txt',
          contentType: 'text/plain',
          size: 512,
        }) as never,
        headers: {
          'Content-Type': 'application/json',
        },
        httpMethod: 'POST',
        path: '/upload',
        resource: '/upload',
        rawBody: JSON.stringify({
          filename: 'notes.txt',
          contentType: 'text/plain',
          size: 512,
        }),
      }) as never,
      {} as never,
      () => undefined
    );

    expect(result?.statusCode).toBe(415);
    expect(result?.body).toBe(
      JSON.stringify({
        message: 'Only audio file uploads are supported.',
      })
    );
    expect(mockedGetSignedUrl).not.toHaveBeenCalled();
  });

  it('returns a server error when the upload bucket is not configured', async () => {
    delete process.env.AUDIO_BUCKET_NAME;

    const result = await main(
      createApiGatewayEvent({
        body: JSON.stringify({
          filename: 'meeting.mp3',
          contentType: 'audio/mpeg',
          size: 1024,
        }) as never,
        headers: {
          'Content-Type': 'application/json',
        },
        httpMethod: 'POST',
        path: '/upload',
        resource: '/upload',
        rawBody: JSON.stringify({
          filename: 'meeting.mp3',
          contentType: 'audio/mpeg',
          size: 1024,
        }),
      }) as never,
      {} as never,
      () => undefined
    );

    expect(result?.statusCode).toBe(500);
    expect(result?.body).toBe(
      JSON.stringify({
        message: 'Upload configuration is missing.',
      })
    );
    expect(mockedGetSignedUrl).not.toHaveBeenCalled();
  });
});
