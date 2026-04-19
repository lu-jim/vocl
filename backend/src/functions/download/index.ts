import { handlerPath } from '@libs/handler-resolver';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      http: {
        authorizer: {
          name: 'VoclCognitoAuthorizer',
          type: 'COGNITO_USER_POOLS',
          arn: {
            'Fn::GetAtt': ['CognitoUserPool', 'Arn'],
          },
        },
        cors: true,
        method: 'get',
        path: 'download/{id}',
      },
    },
  ],
};
