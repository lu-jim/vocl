import { Amplify } from 'aws-amplify';

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  const userPoolId = config.public.cognitoUserPoolId;
  const userPoolClientId = config.public.cognitoUserPoolClientId;
  const region = config.public.awsRegion;

  if (!userPoolId || !userPoolClientId || !region) {
    console.warn(
      '[amplify] Missing Cognito runtime config. Set NUXT_PUBLIC_AWS_REGION, NUXT_PUBLIC_COGNITO_USER_POOL_ID, and NUXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID to enable auth.'
    );
    return;
  }

  Amplify.configure(
    {
      Auth: {
        Cognito: {
          userPoolId,
          userPoolClientId,
        },
      },
    },
    {
      ssr: false,
    }
  );
});
