import { handlerPath } from '@libs/handler-resolver';
import schema from './schema';

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
        method: 'post',
        path: 'realtime/save',
        request: {
          schemas: {
            'application/json': schema,
          },
        },
      },
    },
  ],
};
