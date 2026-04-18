import { formatJSONResponse } from '@libs/api-gateway';

describe('formatJSONResponse', () => {
  it('returns 200 with JSON stringified body and default headers', () => {
    const result = formatJSONResponse({ message: 'ok' });
    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    expect(result.body).toBe('{"message":"ok"}');
  });
});
