import { main } from '@functions/upload/handler';

import { createApiGatewayEvent } from './event-factory';

describe('upload handler', () => {
  it('returns the upload stub payload with the request id', async () => {
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
    expect(result?.body).toBe(
      JSON.stringify({
        message: 'Upload endpoint stub',
        nextStep: 'Implement presigned S3 URL generation and 20MB validation.',
        requestId: 'req-123',
      })
    );
  });
});
