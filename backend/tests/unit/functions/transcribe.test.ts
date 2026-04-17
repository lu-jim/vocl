import { main } from '@functions/transcribe/handler';

import { createApiGatewayEvent } from './event-factory';

const createEvent = (requestId = 'req-transcribe-123') =>
  createApiGatewayEvent({
    body: JSON.stringify({
      transcriptionId: '01JTESTTRANSCRIPTIONID',
      audioKey: 'audio/user-123/01JTESTTRANSCRIPTIONID/source.mp3',
      filename: 'meeting.mp3',
      contentType: 'audio/mpeg',
    }),
    headers: {
      'content-type': 'application/json',
    },
    httpMethod: 'POST',
    path: '/transcribe',
    resource: '/transcribe',
    requestContext: {
      httpMethod: 'POST',
      path: '/transcribe',
      requestId,
      requestTime: '16/Apr/2026:12:00:00 +0000',
      requestTimeEpoch: 1760000000000,
      resourcePath: '/transcribe',
    } as never,
    rawBody: JSON.stringify({
      transcriptionId: '01JTESTTRANSCRIPTIONID',
      audioKey: 'audio/user-123/01JTESTTRANSCRIPTIONID/source.mp3',
      filename: 'meeting.mp3',
      contentType: 'audio/mpeg',
    }),
  }) as Parameters<typeof main>[0];

describe('transcribe handler', () => {
  it('returns the current stub payload with request id', async () => {
    const event = createEvent();
    const result = await main(event, {} as Parameters<typeof main>[1], jest.fn());

    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify({
        message: 'Transcribe function stub',
        status: 'not_implemented',
        requestId: 'req-transcribe-123',
      }),
    });
  });

  it('uses the incoming API Gateway request id in the response body', async () => {
    const event = createEvent('req-transcribe-override');
    const result = await main(event, {} as Parameters<typeof main>[1], jest.fn());

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toMatchObject({
      requestId: 'req-transcribe-override',
      status: 'not_implemented',
    });
  });
});
