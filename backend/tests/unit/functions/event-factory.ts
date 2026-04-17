type MiddyApiGatewayEvent = Parameters<typeof import('@functions/upload/handler').main>[0];
type RequestContext = MiddyApiGatewayEvent['requestContext'];

type EventOverrides = Partial<Omit<MiddyApiGatewayEvent, 'requestContext'>> & {
  requestContext?: Partial<RequestContext>;
};

const baseRequestContext: RequestContext = {
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
  path: '/test',
  stage: 'dev',
  requestId: 'test-request-id',
  requestTime: '16/Apr/2026:12:00:00 +0000',
  requestTimeEpoch: Date.now(),
  resourceId: 'test-resource-id',
  resourcePath: '/test',
};

export const createApiGatewayEvent = (overrides: EventOverrides = {}): MiddyApiGatewayEvent => {
  const requestContext: RequestContext = {
    ...baseRequestContext,
    ...(overrides.requestContext ?? {}),
  };

  return {
    body: null,
    rawBody: '',
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/test',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource: '/test',
    ...overrides,
    requestContext,
  } as MiddyApiGatewayEvent;
};
