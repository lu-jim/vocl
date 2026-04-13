import { formatJSONResponse } from '@libs/api-gateway';

describe('formatJSONResponse', () => {
  it('returns 200 with JSON stringified body', () => {
    const result = formatJSONResponse({ message: 'ok' });
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('{"message":"ok"}');
  });
});
