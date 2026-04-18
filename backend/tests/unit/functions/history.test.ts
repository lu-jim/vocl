import { main } from '@functions/history/handler';

import { createApiGatewayEvent } from './event-factory';

const createEvent = () =>
  createApiGatewayEvent({
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
      authorizer: {},
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
      requestTime: '16/Apr/2026:12:00:00 +0000',
      requestTimeEpoch: 1760000000000,
      resourceId: 'test-resource-id',
      resourcePath: '/transcriptions',
    },
    rawBody: '{}',
  }) as Parameters<typeof main>[0];

describe('history handler', () => {
  it('returns an empty paginated history stub response', async () => {
    const result = await main(createEvent(), {} as never, () => undefined);

    expect(result).toEqual({
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Transcription history endpoint stub',
        items: [],
        nextCursor: null,
      }),
    });
  });
});
