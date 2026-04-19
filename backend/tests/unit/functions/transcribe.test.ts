jest.mock('@libs/transcriptions', () => ({
  getTranscriptionForUser: jest.fn(),
  updateTranscriptionForUser: jest.fn(),
}));

jest.mock('@libs/speechmatics', () => ({
  submitBatchTranscription: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

jest.mock('@aws-sdk/client-s3', () => {
  class GetObjectCommand {
    input: Record<string, unknown>;

    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  return {
    S3Client: jest.fn(() => ({ mockClient: true })),
    GetObjectCommand,
  };
});

import { main } from '@functions/transcribe/handler';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { submitBatchTranscription } from '@libs/speechmatics';
import { getTranscriptionForUser, updateTranscriptionForUser } from '@libs/transcriptions';

import { createApiGatewayEvent } from './event-factory';

const createEvent = (overrides: Parameters<typeof createApiGatewayEvent>[0] = {}) =>
  createApiGatewayEvent({
    body: JSON.stringify({
      transcriptionId: '01JTESTTRANSCRIPTIONID',
    }) as never,
    headers: {
      'content-type': 'application/json',
    },
    httpMethod: 'POST',
    path: '/transcribe',
    resource: '/transcribe',
    requestContext: {
      httpMethod: 'POST',
      path: '/transcribe',
      requestId: 'req-transcribe-123',
      authorizer: {
        claims: {
          sub: 'user-123',
        },
      },
      requestTime: '16/Apr/2026:12:00:00 +0000',
      requestTimeEpoch: 1760000000000,
      resourcePath: '/transcribe',
    } as never,
    rawBody: JSON.stringify({
      transcriptionId: '01JTESTTRANSCRIPTIONID',
    }),
    ...overrides,
  }) as Parameters<typeof main>[0];

describe('transcribe handler', () => {
  const mockedGetSignedUrl = jest.mocked(getSignedUrl);
  const mockedSubmitBatchTranscription = jest.mocked(submitBatchTranscription);
  const mockedGetTranscriptionForUser = jest.mocked(getTranscriptionForUser);
  const mockedUpdateTranscriptionForUser = jest.mocked(updateTranscriptionForUser);

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-18T11:00:00.000Z'));
    process.env.AUDIO_BUCKET_NAME = 'vocl-dev-audio-test';
    process.env.SPEECHMATICS_API_KEY = 'speechmatics-key';
    mockedGetSignedUrl.mockResolvedValue('https://signed.example/download');
    mockedGetTranscriptionForUser.mockResolvedValue({
      userId: 'user-123',
      transcriptionId: '01JTESTTRANSCRIPTIONID',
      filename: 'meeting.mp3',
      contentType: 'audio/mpeg',
      size: 1024,
      status: 'uploaded',
      audioKey: 'uploads/user-123/01JTESTTRANSCRIPTIONID/meeting.mp3',
      createdAt: '2026-04-18T10:00:00.000Z',
      updatedAt: '2026-04-18T10:00:00.000Z',
    });
    mockedSubmitBatchTranscription.mockResolvedValue({
      id: 'sm-job-123',
      status: 'running',
    });
    mockedUpdateTranscriptionForUser.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.AUDIO_BUCKET_NAME;
    delete process.env.SPEECHMATICS_API_KEY;
    mockedGetSignedUrl.mockReset();
    mockedGetTranscriptionForUser.mockReset();
    mockedSubmitBatchTranscription.mockReset();
    mockedUpdateTranscriptionForUser.mockReset();
  });

  it('starts a Speechmatics job for an authenticated user upload', async () => {
    const result = await main(createEvent(), {} as never, jest.fn());

    expect(result).toEqual({
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Transcription job started.',
        transcriptionId: '01JTESTTRANSCRIPTIONID',
        status: 'processing',
        speechmaticsJobId: 'sm-job-123',
      }),
    });
    expect(mockedGetTranscriptionForUser).toHaveBeenCalledWith(
      'user-123',
      '01JTESTTRANSCRIPTIONID'
    );
    expect(mockedSubmitBatchTranscription).toHaveBeenCalledWith({
      fetchUrl: 'https://signed.example/download',
      transcriptionId: '01JTESTTRANSCRIPTIONID',
      filename: 'meeting.mp3',
      language: 'en',
    });
    expect(mockedUpdateTranscriptionForUser).toHaveBeenCalledWith(
      'user-123',
      '01JTESTTRANSCRIPTIONID',
      {
        status: 'processing',
        speechmaticsJobId: 'sm-job-123',
        language: 'en',
        updatedAt: '2026-04-18T11:00:00.000Z',
      }
    );
  });

  it('rejects unauthenticated requests', async () => {
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
    expect(result.body).toBe(
      JSON.stringify({
        message: 'Authentication is required.',
      })
    );
  });

  it('returns not found when the record does not belong to the user', async () => {
    mockedGetTranscriptionForUser.mockResolvedValue(null);

    const result = await main(createEvent(), {} as never, jest.fn());

    expect(result.statusCode).toBe(404);
    expect(result.body).toBe(
      JSON.stringify({
        message: 'Transcription not found.',
      })
    );
  });

  it('returns a conflict when the upload is already processing', async () => {
    mockedGetTranscriptionForUser.mockResolvedValue({
      userId: 'user-123',
      transcriptionId: '01JTESTTRANSCRIPTIONID',
      filename: 'meeting.mp3',
      contentType: 'audio/mpeg',
      size: 1024,
      status: 'processing',
      audioKey: 'uploads/user-123/01JTESTTRANSCRIPTIONID/meeting.mp3',
      createdAt: '2026-04-18T10:00:00.000Z',
      updatedAt: '2026-04-18T10:00:00.000Z',
    });

    const result = await main(createEvent(), {} as never, jest.fn());

    expect(result.statusCode).toBe(409);
    expect(result.body).toBe(
      JSON.stringify({
        message: 'This transcription is already being processed.',
      })
    );
  });

  it('surfaces Speechmatics submission errors as a backend response', async () => {
    mockedSubmitBatchTranscription.mockRejectedValue(new Error('quota exceeded'));

    const result = await main(createEvent(), {} as never, jest.fn());

    expect(result).toEqual({
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'quota exceeded',
      }),
    });
  });
});
