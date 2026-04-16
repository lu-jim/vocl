import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const upload = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return formatJSONResponse({
    message: 'Upload endpoint stub',
    nextStep: 'Implement presigned S3 URL generation and 20MB validation.',
    requestId: event.requestContext.requestId,
  });
};

export const main = middyfy(upload);
