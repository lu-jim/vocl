import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { getAuthenticatedUserId } from '@libs/auth';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { createRealtimeTranscriptionToken } from '@libs/speechmatics';

const REALTIME_TOKEN_TTL_SECONDS = 300;

const getRealtimeTokenError = (error: unknown) => {
  if (error instanceof Error) {
    if (error.message === 'Speechmatics API key is missing.') {
      return {
        statusCode: 500,
        message: 'Realtime transcription is not configured.',
      };
    }

    return {
      statusCode: 502,
      message: error.message,
    };
  }

  return {
    statusCode: 502,
    message: 'Could not create the realtime transcription session.',
  };
};

const realtimeToken = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = getAuthenticatedUserId(event);

  if (!userId) {
    return formatJSONResponse(
      {
        message: 'Authentication is required.',
      },
      { statusCode: 401 }
    );
  }

  try {
    const session = await createRealtimeTranscriptionToken(REALTIME_TOKEN_TTL_SECONDS);

    return formatJSONResponse(
      {
        jwt: session.key,
        websocketUrl: session.websocketUrl,
        expiresInSeconds: session.expiresInSeconds,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Failed to create realtime transcription token.', {
      userId,
      error,
    });

    const response = getRealtimeTokenError(error);

    return formatJSONResponse(
      {
        message: response.message,
      },
      { statusCode: response.statusCode }
    );
  }
};

export const main = middyfy(realtimeToken);
