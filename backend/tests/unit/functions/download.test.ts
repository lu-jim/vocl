jest.mock('@libs/transcriptions', () => ({
  getTranscriptionForUser: jest.fn(),
}));

jest.mock('@libs/speechmatics', () => ({
  getBatchTranscriptionTranscript: jest.fn(),
}));

import { main } from '@functions/download/handler';
import { getBatchTranscriptionTranscript } from '@libs/speechmatics';
import { getTranscriptionForUser } from '@libs/transcriptions';

import { createApiGatewayEvent } from './event-factory';

describe('download handler', () => {
  const mockedGetTranscriptionForUser = jest.mocked(getTranscriptionForUser);
  const mockedGetBatchTranscriptionTranscript = jest.mocked(getBatchTranscriptionTranscript);

  afterEach(() => {
    mockedGetTranscriptionForUser.mockReset();
    mockedGetBatchTranscriptionTranscript.mockReset();
  });

  it('returns the transcript text for a completed transcription', async () => {
    mockedGetTranscriptionForUser.mockResolvedValue({
      userId: 'user-123',
      transcriptionId: 'test-id',
      filename: 'meeting.mp3',
      contentType: 'audio/mpeg',
      size: 1234,
      status: 'completed',
      audioKey: 'uploads/user-123/test-id/meeting.mp3',
      createdAt: '2026-04-18T09:30:00.000Z',
      updatedAt: '2026-04-18T09:35:00.000Z',
      speechmaticsJobId: 'sm-job-123',
    });
    mockedGetBatchTranscriptionTranscript.mockResolvedValue('Hello from Speechmatics.');

    const result = await main(
      createApiGatewayEvent({
        httpMethod: 'GET',
        path: '/download/test-id',
        resource: '/download/{id}',
        pathParameters: { id: 'test-id' },
        requestContext: {
          authorizer: {
            claims: {
              sub: 'user-123',
            },
          },
        } as never,
      }) as never,
      {} as never,
      () => undefined
    );

    expect(result).toEqual({
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': 'attachment; filename="meeting.txt"',
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: 'Hello from Speechmatics.',
    });
  });

  it('returns inline transcript text when requested', async () => {
    mockedGetTranscriptionForUser.mockResolvedValue({
      userId: 'user-123',
      transcriptionId: 'test-id',
      filename: 'meeting.mp3',
      contentType: 'audio/mpeg',
      size: 1234,
      status: 'completed',
      audioKey: 'uploads/user-123/test-id/meeting.mp3',
      createdAt: '2026-04-18T09:30:00.000Z',
      updatedAt: '2026-04-18T09:35:00.000Z',
      speechmaticsJobId: 'sm-job-123',
    });
    mockedGetBatchTranscriptionTranscript.mockResolvedValue('Inline transcript.');

    const result = await main(
      createApiGatewayEvent({
        httpMethod: 'GET',
        path: '/download/test-id',
        resource: '/download/{id}',
        pathParameters: { id: 'test-id' },
        queryStringParameters: {
          disposition: 'inline',
        },
        requestContext: {
          authorizer: {
            claims: {
              sub: 'user-123',
            },
          },
        } as never,
      }) as never,
      {} as never,
      () => undefined
    );

    expect(result).toEqual({
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': 'inline; filename="meeting.txt"',
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: 'Inline transcript.',
    });
  });

  it('rejects incomplete transcriptions', async () => {
    mockedGetTranscriptionForUser.mockResolvedValue({
      userId: 'user-123',
      transcriptionId: 'test-id',
      filename: 'meeting.mp3',
      contentType: 'audio/mpeg',
      size: 1234,
      status: 'processing',
      audioKey: 'uploads/user-123/test-id/meeting.mp3',
      createdAt: '2026-04-18T09:30:00.000Z',
      updatedAt: '2026-04-18T09:35:00.000Z',
      speechmaticsJobId: 'sm-job-123',
    });

    const result = await main(
      createApiGatewayEvent({
        httpMethod: 'GET',
        path: '/download/test-id',
        resource: '/download/{id}',
        pathParameters: { id: 'test-id' },
        requestContext: {
          authorizer: {
            claims: {
              sub: 'user-123',
            },
          },
        } as never,
      }) as never,
      {} as never,
      () => undefined
    );

    expect(result.statusCode).toBe(409);
    expect(result.body).toBe(
      JSON.stringify({
        message: 'Transcript is not ready yet.',
      })
    );
  });
});
