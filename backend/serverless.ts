import type { AWS } from '@serverless/typescript';

import download from '@functions/download';
import hello from '@functions/hello';
import history from '@functions/history';
import realtimeToken from '@functions/realtime-token';
import transcribe from '@functions/transcribe';
import upload from '@functions/upload';

const stage = '${opt:stage, self:provider.stage}';
const serviceName = 'vocl';
const apiGatewayCorsResponseParameters = {
  'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
  'gatewayresponse.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
  'gatewayresponse.header.Access-Control-Allow-Methods': "'GET,POST,OPTIONS'",
};

export const serverlessConfiguration: AWS = {
  service: serviceName,
  frameworkVersion: '3',
  plugins: ['serverless-esbuild'],
  provider: {
    name: 'aws',
    runtime: 'nodejs20.x',
    region: 'eu-west-3',
    stage: 'dev',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      STAGE: stage,
      TRANSCRIPTIONS_TABLE_NAME: '${self:service}-${self:provider.stage}-transcriptions',
      AUDIO_BUCKET_NAME: '${self:service}-${self:provider.stage}-audio-${aws:accountId}',
      SPEECHMATICS_API_KEY: '${ssm:/vocl/speechmatics-api-key}',
      USER_POOL_ID: { Ref: 'CognitoUserPool' },
      USER_POOL_CLIENT_ID: { Ref: 'CognitoUserPoolClient' },
    },
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: [
              'dynamodb:GetItem',
              'dynamodb:PutItem',
              'dynamodb:Query',
              'dynamodb:UpdateItem',
            ],
            Resource: [{ 'Fn::GetAtt': ['TranscriptionsTable', 'Arn'] }],
          },
          {
            Effect: 'Allow',
            Action: ['s3:GetObject', 's3:PutObject'],
            Resource: [
              {
                'Fn::Join': ['', [{ 'Fn::GetAtt': ['AudioBucket', 'Arn'] }, '/*']],
              },
            ],
          },
        ],
      },
    },
  },
  functions: { hello, upload, transcribe, history, download, realtimeToken },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node20',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
  },
  resources: {
    Resources: {
      CognitoUserPool: {
        Type: 'AWS::Cognito::UserPool',
        Properties: {
          UserPoolName: '${self:service}-${self:provider.stage}-users',
          UsernameAttributes: ['email'],
          AutoVerifiedAttributes: ['email'],
          Policies: {
            PasswordPolicy: {
              MinimumLength: 8,
              RequireLowercase: true,
              RequireNumbers: true,
              RequireSymbols: false,
              RequireUppercase: true,
            },
          },
          Schema: [
            {
              Name: 'email',
              AttributeDataType: 'String',
              Mutable: true,
              Required: true,
            },
          ],
        },
      },
      CognitoUserPoolClient: {
        Type: 'AWS::Cognito::UserPoolClient',
        Properties: {
          ClientName: '${self:service}-${self:provider.stage}-web-client',
          UserPoolId: { Ref: 'CognitoUserPool' },
          ExplicitAuthFlows: [
            'ALLOW_USER_PASSWORD_AUTH',
            'ALLOW_REFRESH_TOKEN_AUTH',
            'ALLOW_USER_SRP_AUTH',
          ],
          GenerateSecret: false,
          PreventUserExistenceErrors: 'ENABLED',
        },
      },
      TranscriptionsTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: '${self:service}-${self:provider.stage}-transcriptions',
          BillingMode: 'PAY_PER_REQUEST',
          AttributeDefinitions: [
            { AttributeName: 'userId', AttributeType: 'S' },
            { AttributeName: 'transcriptionId', AttributeType: 'S' },
          ],
          KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' },
            { AttributeName: 'transcriptionId', KeyType: 'RANGE' },
          ],
        },
      },
      AudioBucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: '${self:service}-${self:provider.stage}-audio-${aws:accountId}',
          CorsConfiguration: {
            CorsRules: [
              {
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT'],
                AllowedOrigins: ['*'],
                MaxAge: 3000,
              },
            ],
          },
        },
      },
      AudioBucketPolicy: {
        Type: 'AWS::S3::BucketPolicy',
        Properties: {
          Bucket: { Ref: 'AudioBucket' },
          PolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'DenyInsecureTransport',
                Effect: 'Deny',
                Principal: '*',
                Action: 's3:*',
                Resource: [
                  { 'Fn::GetAtt': ['AudioBucket', 'Arn'] },
                  {
                    'Fn::Join': ['', [{ 'Fn::GetAtt': ['AudioBucket', 'Arn'] }, '/*']],
                  },
                ],
                Condition: {
                  Bool: {
                    'aws:SecureTransport': false,
                  },
                },
              },
            ],
          },
        },
      },
      ApiGatewayDefault4xxGatewayResponse: {
        Type: 'AWS::ApiGateway::GatewayResponse',
        Properties: {
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          ResponseType: 'DEFAULT_4XX',
          ResponseParameters: apiGatewayCorsResponseParameters,
        },
      },
      ApiGatewayDefault5xxGatewayResponse: {
        Type: 'AWS::ApiGateway::GatewayResponse',
        Properties: {
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          ResponseType: 'DEFAULT_5XX',
          ResponseParameters: apiGatewayCorsResponseParameters,
        },
      },
      ApiGatewayUnauthorizedGatewayResponse: {
        Type: 'AWS::ApiGateway::GatewayResponse',
        Properties: {
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          ResponseType: 'UNAUTHORIZED',
          ResponseParameters: apiGatewayCorsResponseParameters,
        },
      },
      ApiGatewayAccessDeniedGatewayResponse: {
        Type: 'AWS::ApiGateway::GatewayResponse',
        Properties: {
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          ResponseType: 'ACCESS_DENIED',
          ResponseParameters: apiGatewayCorsResponseParameters,
        },
      },
    },
    Outputs: {
      CognitoUserPoolId: {
        Value: { Ref: 'CognitoUserPool' },
      },
      CognitoUserPoolClientId: {
        Value: { Ref: 'CognitoUserPoolClient' },
      },
      TranscriptionsTableName: {
        Value: { Ref: 'TranscriptionsTable' },
      },
      AudioBucketName: {
        Value: { Ref: 'AudioBucket' },
      },
      AwsRegion: {
        Value: '${self:provider.region}',
      },
      Stage: {
        Value: '${self:provider.stage}',
      },
    },
  },
};

export default serverlessConfiguration;

module.exports = serverlessConfiguration;
