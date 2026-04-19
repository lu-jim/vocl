const mockDynamoSend = jest.fn();
const mockS3Send = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => {
  class PutCommand {
    input;

    constructor(input) {
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

jest.mock('@aws-sdk/client-s3', () => {
  class PutObjectCommand {
    input;

    constructor(input) {
      this.input = input;
    }
  }

  return {
    S3Client: jest.fn(() => ({ send: mockS3Send })),
    PutObjectCommand,
  };
});

jest.mock('ulid', () => ({
  ulid: jest.fn(() => '01JLIVETRANSCRIPT01'),
}));

import { main } from '@functions/realtime-save/handler';

import { createApiGatewayEvent } from './event-factory';

const createEvent = (overrides: Parameters<typeof createApiGatewayEvent>[0] = {}) =>
  createApiGatewayEvent({
    body: JSON.stringify({
      transcript: 'Hello from a live session.',
      title: 'Weekly standup',
      language: 'en',
    }) as never,
    headers: {
      'content-type': 'application/json',
    },
    httpMethod: 'POST',
    path: '/realtime/save',
    resource: '/realtime/save',
    rawBody: JSON.stringify({
      transcript: 'Hello from a live session.',
      title: 'Weekly standup',
      language: 'en',
    }),
    requestContext: {
      httpMethod: 'POST',
      path: '/realtime/save',
      requestId: 'req-realtime-save-123',
      authorizer: {
        claims: {
          sub: 'user-123',
        },
      },
      requestTime: '19/Apr/2026:12:00:00 +0000',
      requestTimeEpoch: 1770000000000,
      resourcePath: '/realtime/save',
    } as never,
    ...overrides,
  }) as Parameters<typeof main>[0];

describe('realtime save handler', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-19T12:00:00.000Z'));
    process.env.AUDIO_BUCKET_NAME = 'vocl-dev-audio-test';
    process.env.TRANSCRIPTIONS_TABLE_NAME = 'vocl-dev-transcriptions';
    mockDynamoSend.mockResolvedValue({});
    mockS3Send.mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.AUDIO_BUCKET_NAME;
    delete process.env.TRANSCRIPTIONS_TABLE_NAME;
    mockDynamoSend.mockReset();
    mockS3Send.mockReset();
  });

  it('stores a live transcript in S3 and creates a completed DynamoDB record', async () => {
    const result = await main(createEvent(), {} as never, jest.fn());

    expect(result).toEqual({
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Live transcript saved.',
        transcriptionId: '01JLIVETRANSCRIPT01',
        transcriptKey: 'transcripts/user-123/01JLIVETRANSCRIPT01/weekly-standup.txt',
        filename: 'weekly-standup.txt',
        status: 'completed',
      }),
    });
    expect(mockS3Send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Bucket: 'vocl-dev-audio-test',
          Key: 'transcripts/user-123/01JLIVETRANSCRIPT01/weekly-standup.txt',
          Body: 'Hello from a live session.',
          ContentType: 'text/plain; charset=utf-8',
        },
      })
    );
    expect(mockDynamoSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          TableName: 'vocl-dev-transcriptions',
          Item: expect.objectContaining({
            userId: 'user-123',
            transcriptionId: '01JLIVETRANSCRIPT01',
            filename: 'weekly-standup.txt',
            contentType: 'text/plain',
            status: 'completed',
            transcriptKey: 'transcripts/user-123/01JLIVETRANSCRIPT01/weekly-standup.txt',
            language: 'en',
            createdAt: '2026-04-19T12:00:00.000Z',
            updatedAt: '2026-04-19T12:00:00.000Z',
            completedAt: '2026-04-19T12:00:00.000Z',
          }),
        },
      })
    );
  });

  it('rejects unauthenticated save requests', async () => {
    const result = await main(
      createEvent({
        requestContext: {
          authorizer: {},
        } as never,
      }),
      {} as never,
      jest.fn()
    );

    expect(result.statusCode).toBe(401);
    expect(mockS3Send).not.toHaveBeenCalled();
    expect(mockDynamoSend).not.toHaveBeenCalled();
  });
});
