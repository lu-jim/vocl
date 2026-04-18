import type { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import type { FromSchema } from 'json-schema-to-ts';

type ValidatedAPIGatewayProxyEvent<S> = Omit<APIGatewayProxyEvent, 'body'> & {
  body: FromSchema<S>;
};
export type ValidatedEventAPIGatewayProxyEvent<S> = Handler<
  ValidatedAPIGatewayProxyEvent<S>,
  APIGatewayProxyResult
>;

type JsonResponseOptions = {
  statusCode?: number;
  headers?: Record<string, string>;
};

export const formatJSONResponse = (
  response: Record<string, unknown>,
  options: JsonResponseOptions = {}
) => {
  return {
    statusCode: options.statusCode ?? 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...options.headers,
    },
    body: JSON.stringify(response),
  };
};
