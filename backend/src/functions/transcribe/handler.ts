import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';

const transcribe = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return formatJSONResponse({
    message: 'Transcribe function stub',
    status: 'not_implemented',
    requestId: event.requestContext.requestId,
  });
};

export const main = middyfy(transcribe);
