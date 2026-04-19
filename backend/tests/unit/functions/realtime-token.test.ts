jest.mock('@libs/speechmatics', () => ({
  createRealtimeTranscriptionToken: jest.fn(),
}));

import { main } from '@functions/realtime-token/handler';
import { createRealtimeTranscriptionToken } from '@libs/speechmatics';

import { createApiGatewayEvent } from './event-factory';

const createEvent = (overrides: Parameters<typeof createApiGatewayEvent>[0] = {}) =>
  createApiGatewayEvent({
    httpMethod: 'GET',
    path: '/realtime/token',
    resource: '/realtime/token',
    requestContext: {
      httpMethod: 'GET',
      path: '/realtime/token',
      requestId: 'req-realtime-token-123',
      authorizer: {
        claims: {
          sub: 'user-123',
        },
      },
      requestTime: '19/Apr/2026:12:00:00 +0000',
      requestTimeEpoch: 1770000000000,
      resourcePath: '/realtime/token',
    } as never,
    ...overrides,
  }) as Parameters<typeof main>[0];

describe('realtime token handler', () => {
  const mockedCreateRealtimeTranscriptionToken = jest.mocked(createRealtimeTranscriptionToken);

  afterEach(() => {
    mockedCreateRealtimeTranscriptionToken.mockReset();
  });

  it('returns a short-lived Speechmatics realtime token for authenticated users', async () => {
    mockedCreateRealtimeTranscriptionToken.mockResolvedValue({
      key: 'temporary-jwt',
      websocketUrl: 'wss://eu.rt.speechmatics.com/v2?jwt=temporary-jwt',
      expiresInSeconds: 300,
    });

    const result = await main(createEvent(), {} as never, jest.fn());

    expect(result).toEqual({
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({
        jwt: 'temporary-jwt',
        websocketUrl: 'wss://eu.rt.speechmatics.com/v2?jwt=temporary-jwt',
        expiresInSeconds: 300,
      }),
    });
  });

  it('rejects unauthenticated token requests', async () => {
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
});
