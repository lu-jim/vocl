import { main } from '@functions/download/handler';

import { createApiGatewayEvent } from './event-factory';

describe('download handler', () => {
  it('returns the current stub response', async () => {
    const result = await main(
      createApiGatewayEvent({
        httpMethod: 'GET',
        path: '/download/test-id',
        resource: '/download/{id}',
        pathParameters: { id: 'test-id' },
      }) as never,
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
        message: 'Download function stub',
      }),
    });
  });
});
