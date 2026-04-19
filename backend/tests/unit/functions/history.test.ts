const mockDynamoSend = jest.fn();

jest.mock('@libs/speechmatics', () => ({
  getBatchTranscriptionJob: jest.fn(),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => {
  class GetCommand {
    input: Record<string, unknown>;

    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  class QueryCommand {
    input: Record<string, unknown>;

    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  class UpdateCommand {
    input: Record<string, unknown>;

    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  return {
    DynamoDBDocumentClient: {
      from: jest.fn(() => ({ send: mockDynamoSend })),
    },
    GetCommand,
    QueryCommand,
    UpdateCommand,
  };
});

import { main } from '@functions/history/handler';
import { getBatchTranscriptionJob } from '@libs/speechmatics';

import { createApiGatewayEvent } from './event-factory';

const createEvent = (overrides: Parameters<typeof createApiGatewayEvent>[0] = {}) => {
  const baseEvent = {
    body: '{}',
    headers: {
      'content-type': 'application/json',
    },
    httpMethod: 'GET',
    path: '/transcriptions',
    resource: '/transcriptions',
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api-id',
      protocol: 'HTTP/1.1',
      httpMethod: 'GET',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'jest',
        userArn: null,
      },
      path: '/transcriptions',
      stage: 'dev',
      requestId: 'history-request-id',
      authorizer: {
        claims: {
          sub: 'user-123',
        },
      },
      requestTime: '16/Apr/2026:12:00:00 +0000',
      requestTimeEpoch: 1760000000000,
      resourceId: 'test-resource-id',
      resourcePath: '/transcriptions',
    },
    rawBody: '{}',
  };

  return createApiGatewayEvent({
    ...baseEvent,
    ...overrides,
    requestContext: {
      ...baseEvent.requestContext,
      ...(overrides.requestContext ?? {}),
    },
  }) as Parameters<typeof main>[0];
};

describe('history handler', () => {
  const mockedGetBatchTranscriptionJob = jest.mocked(getBatchTranscriptionJob);

  beforeEach(() => {
    process.env.TRANSCRIPTIONS_TABLE_NAME = 'vocl-dev-transcriptions';
  });

  afterEach(() => {
    delete process.env.TRANSCRIPTIONS_TABLE_NAME;
    mockDynamoSend.mockReset();
    mockedGetBatchTranscriptionJob.mockReset();
  });

  it('returns the authenticated user upload history from DynamoDB', async () => {
    mockDynamoSend.mockResolvedValue({
      Items: [
        {
          userId: 'user-123',
          transcriptionId: '01JUPLOADTESTULID',
          filename: 'meeting.mp3',
          status: 'uploaded',
          audioKey: 'uploads/user-123/01JUPLOADTESTULID/meeting.mp3',
          createdAt: '2026-04-18T09:30:00.000Z',
        },
      ],
    });

    const result = await main(createEvent(), {} as never, () => undefined);

    expect(result).toEqual({
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        items: [
          {
            transcriptionId: '01JUPLOADTESTULID',
            filename: 'meeting.mp3',
            status: 'uploaded',
            audioKey: 'uploads/user-123/01JUPLOADTESTULID/meeting.mp3',
            createdAt: '2026-04-18T09:30:00.000Z',
          },
        ],
        nextCursor: null,
      }),
    });
    expect(mockDynamoSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          TableName: 'vocl-dev-transcriptions',
          ExpressionAttributeValues: {
            ':userId': 'user-123',
          },
        }),
      })
    );
  });

  it('rejects unauthenticated history requests', async () => {
    const result = await main(
      createEvent({
        requestContext: {
          authorizer: {},
        } as never,
      }),
      {} as never,
      () => undefined
    );

    expect(result).toEqual({
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Authentication is required.',
      }),
    });
  });

  it('returns a single upload record for the authenticated user', async () => {
    mockDynamoSend.mockResolvedValue({
      Item: {
        userId: 'user-123',
        transcriptionId: '01JUPLOADTESTULID',
        filename: 'meeting.mp3',
        status: 'uploaded',
        audioKey: 'uploads/user-123/01JUPLOADTESTULID/meeting.mp3',
        createdAt: '2026-04-18T09:30:00.000Z',
      },
    });

    const result = await main(
      createEvent({
        path: '/transcriptions/01JUPLOADTESTULID',
        resource: '/transcriptions/{id}',
        pathParameters: { id: '01JUPLOADTESTULID' },
        requestContext: {
          path: '/transcriptions/01JUPLOADTESTULID',
          resourcePath: '/transcriptions/{id}',
        } as never,
      }),
      {} as never,
      () => undefined
    );

    expect(result).toEqual({
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        item: {
          transcriptionId: '01JUPLOADTESTULID',
          filename: 'meeting.mp3',
          status: 'uploaded',
          audioKey: 'uploads/user-123/01JUPLOADTESTULID/meeting.mp3',
          createdAt: '2026-04-18T09:30:00.000Z',
        },
      }),
    });
  });

  it('syncs processing jobs to completed when Speechmatics reports done', async () => {
    mockDynamoSend
      .mockResolvedValueOnce({
        Items: [
          {
            userId: 'user-123',
            transcriptionId: '01JPROCESSINGTEST',
            filename: 'meeting.mp3',
            status: 'processing',
            audioKey: 'uploads/user-123/01JPROCESSINGTEST/meeting.mp3',
            createdAt: '2026-04-18T09:30:00.000Z',
            updatedAt: '2026-04-18T09:35:00.000Z',
            speechmaticsJobId: 'sm-job-123',
          },
        ],
      })
      .mockResolvedValueOnce({});

    mockedGetBatchTranscriptionJob.mockResolvedValue({
      id: 'sm-job-123',
      status: 'done',
      errorMessage: undefined,
    });

    const result = await main(createEvent(), {} as never, () => undefined);
    const parsedBody = JSON.parse(result.body) as {
      items: Array<{ transcriptionId: string; status: string }>;
    };

    expect(result.statusCode).toBe(200);
    expect(parsedBody.items).toEqual([
      expect.objectContaining({
        transcriptionId: '01JPROCESSINGTEST',
        status: 'completed',
      }),
    ]);
    expect(mockedGetBatchTranscriptionJob).toHaveBeenCalledWith('sm-job-123');
    expect(mockDynamoSend).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        input: expect.objectContaining({
          TableName: 'vocl-dev-transcriptions',
          Key: {
            userId: 'user-123',
            transcriptionId: '01JPROCESSINGTEST',
          },
          UpdateExpression: expect.stringContaining('SET'),
        }),
      })
    );
  });
});
