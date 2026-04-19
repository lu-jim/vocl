const mockDynamoSend = jest.fn();

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => {
  class PutCommand {
    input: Record<string, unknown>;

    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  return {
    DynamoDBDocumentClient: {
      from: jest.fn(() => ({ send: mockDynamoSend })),
    },
    PutCommand,
  };
});

jest.mock('ulid', () => ({
  ulid: jest.fn(() => '01JUPLOADTESTULID'),
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
    process.env.TRANSCRIPTIONS_TABLE_NAME = 'vocl-dev-transcriptions';
    mockedGetSignedUrl.mockResolvedValue('https://signed.example/upload');
    mockDynamoSend.mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.AUDIO_BUCKET_NAME;
    delete process.env.TRANSCRIPTIONS_TABLE_NAME;
    mockedGetSignedUrl.mockReset();
    mockDynamoSend.mockReset();
  });

  it('returns a presigned upload payload and stores metadata for authenticated uploads', async () => {
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
          authorizer: {
            claims: {
              sub: 'user-123',
            },
          },
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
        transcriptionId: '01JUPLOADTESTULID',
        audioKey: 'uploads/user-123/01JUPLOADTESTULID/meeting.mp3',
        bucketName: 'vocl-dev-audio-test',
        expiresInSeconds: 900,
        maxUploadSizeBytes: 20971520,
        headers: {
          'Content-Type': 'audio/mpeg',
        },
      })
    );
    expect(mockedGetSignedUrl).toHaveBeenCalledTimes(1);
    expect(mockDynamoSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          TableName: 'vocl-dev-transcriptions',
          Item: expect.objectContaining({
            userId: 'user-123',
            transcriptionId: '01JUPLOADTESTULID',
            filename: 'meeting.mp3',
            contentType: 'audio/mpeg',
            size: 1024,
            status: 'uploaded',
            audioKey: 'uploads/user-123/01JUPLOADTESTULID/meeting.mp3',
            createdAt: '2026-04-18T09:30:00.000Z',
            updatedAt: '2026-04-18T09:30:00.000Z',
          }),
        },
      })
    );
  });

  it('rejects unauthenticated upload requests', async () => {
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
          requestId: 'req-unauthenticated',
          authorizer: {},
          resourcePath: '/upload',
        } as never,
      }) as never,
      {} as never,
      () => undefined
    );

    expect(result?.statusCode).toBe(401);
    expect(result?.body).toBe(
      JSON.stringify({
        message: 'Authentication is required.',
      })
    );
    expect(mockedGetSignedUrl).not.toHaveBeenCalled();
    expect(mockDynamoSend).not.toHaveBeenCalled();
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
        requestContext: {
          httpMethod: 'POST',
          path: '/upload',
          requestId: 'req-too-large',
          authorizer: {
            claims: {
              sub: 'user-123',
            },
          },
          resourcePath: '/upload',
        } as never,
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
    expect(mockDynamoSend).not.toHaveBeenCalled();
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
        requestContext: {
          httpMethod: 'POST',
          path: '/upload',
          requestId: 'req-invalid-type',
          authorizer: {
            claims: {
              sub: 'user-123',
            },
          },
          resourcePath: '/upload',
        } as never,
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
    expect(mockDynamoSend).not.toHaveBeenCalled();
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
        requestContext: {
          httpMethod: 'POST',
          path: '/upload',
          requestId: 'req-missing-bucket',
          authorizer: {
            claims: {
              sub: 'user-123',
            },
          },
          resourcePath: '/upload',
        } as never,
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
    expect(mockDynamoSend).not.toHaveBeenCalled();
  });
});
