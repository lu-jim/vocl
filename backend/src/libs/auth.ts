type EventWithAuthorizer = {
  requestContext: {
    authorizer?: unknown;
  };
};

export const getAuthenticatedUserId = (event: EventWithAuthorizer): string | null => {
  const authorizer = event.requestContext.authorizer as
    | { claims?: { sub?: string } }
    | undefined;

  return authorizer?.claims?.sub ?? null;
};
