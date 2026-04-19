type FetchLikeError = {
  message?: string;
  statusCode?: number;
  data?: {
    message?: string;
  };
  response?: {
    status?: number;
    _data?: {
      message?: string;
    };
  };
};

const getStatusCode = (error: FetchLikeError) => {
  return error.statusCode ?? error.response?.status ?? null;
};

const getServerMessage = (error: FetchLikeError) => {
  return error.data?.message ?? error.response?._data?.message ?? null;
};

export const getApiErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof Error) {
    const fetchLikeError = error as FetchLikeError;
    const serverMessage = getServerMessage(fetchLikeError);

    if (serverMessage) {
      return serverMessage;
    }

    const statusCode = getStatusCode(fetchLikeError);

    if (statusCode === 401) {
      return 'Your session has expired. Sign in again and retry.';
    }

    if (statusCode === 403) {
      return 'You do not have permission to perform that action.';
    }

    if (statusCode && statusCode >= 500) {
      return 'The service is unavailable right now. Please try again shortly.';
    }

    if (error.message.includes('Failed to fetch') || error.message.includes('<no response>')) {
      return 'We could not reach the service. Please try again shortly.';
    }
  }

  return fallbackMessage;
};
