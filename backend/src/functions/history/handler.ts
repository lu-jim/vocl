import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import type { APIGatewayProxyHandler } from 'aws-lambda';

const history: APIGatewayProxyHandler = async () => {
  return formatJSONResponse({
    message: 'Transcription history endpoint stub',
    items: [],
    nextCursor: null,
  });
};

export const main = middyfy(history);
