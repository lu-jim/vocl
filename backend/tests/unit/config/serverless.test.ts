import serverlessConfiguration from '../../../serverless';

describe('serverless configuration', () => {
  it('uses the expected service and provider defaults', () => {
    expect(serverlessConfiguration.service).toBe('vocl');
    expect(serverlessConfiguration.frameworkVersion).toBe('3');
    expect(serverlessConfiguration.provider?.name).toBe('aws');
    expect(serverlessConfiguration.provider?.runtime).toBe('nodejs20.x');
    expect(serverlessConfiguration.provider?.region).toBe('eu-west-3');
    expect(serverlessConfiguration.provider?.stage).toBe('dev');
  });

  it('registers the current backend functions', () => {
    expect(serverlessConfiguration.functions).toEqual(
      expect.objectContaining({
        hello: expect.any(Object),
        upload: expect.any(Object),
        transcribe: expect.any(Object),
        history: expect.any(Object),
        download: expect.any(Object),
      })
    );
  });

  it('uses a named Cognito authorizer for protected REST endpoints', () => {
    const uploadEvents = (serverlessConfiguration.functions?.upload as { events?: unknown[] })?.events;
    const historyEvents = (serverlessConfiguration.functions?.history as { events?: unknown[] })?.events;

    expect(uploadEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          http: expect.objectContaining({
            authorizer: expect.objectContaining({
              name: 'VoclCognitoAuthorizer',
              type: 'COGNITO_USER_POOLS',
              arn: { 'Fn::GetAtt': ['CognitoUserPool', 'Arn'] },
            }),
          }),
        }),
      ])
    );

    expect(historyEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          http: expect.objectContaining({
            authorizer: expect.objectContaining({
              name: 'VoclCognitoAuthorizer',
              type: 'COGNITO_USER_POOLS',
              arn: { 'Fn::GetAtt': ['CognitoUserPool', 'Arn'] },
            }),
          }),
        }),
      ])
    );
  });

  it('exposes environment variables required by the app', () => {
    expect(serverlessConfiguration.provider?.environment).toEqual(
      expect.objectContaining({
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
        STAGE: '${opt:stage, self:provider.stage}',
        TRANSCRIPTIONS_TABLE_NAME: '${self:service}-${self:provider.stage}-transcriptions',
        AUDIO_BUCKET_NAME: '${self:service}-${self:provider.stage}-audio-${aws:accountId}',
        USER_POOL_ID: { Ref: 'CognitoUserPool' },
        USER_POOL_CLIENT_ID: { Ref: 'CognitoUserPoolClient' },
      })
    );
  });

  it('configures least-privilege IAM statements for DynamoDB and S3 access', () => {
    const iamRole = serverlessConfiguration.provider?.iam?.role as {
      statements?: unknown[];
    };
    const statements = iamRole?.statements;

    expect(statements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Effect: 'Allow',
          Action: expect.arrayContaining([
            'dynamodb:GetItem',
            'dynamodb:PutItem',
            'dynamodb:Query',
            'dynamodb:UpdateItem',
          ]),
          Resource: [{ 'Fn::GetAtt': ['TranscriptionsTable', 'Arn'] }],
        }),
        expect.objectContaining({
          Effect: 'Allow',
          Action: ['s3:GetObject', 's3:PutObject'],
          Resource: [
            {
              'Fn::Join': ['', [{ 'Fn::GetAtt': ['AudioBucket', 'Arn'] }, '/*']],
            },
          ],
        }),
      ])
    );
  });

  it('defines the core AWS resources for Day 1 Afternoon', () => {
    const resources = serverlessConfiguration.resources?.Resources;

    expect(resources).toEqual(
      expect.objectContaining({
        CognitoUserPool: expect.objectContaining({
          Type: 'AWS::Cognito::UserPool',
        }),
        CognitoUserPoolClient: expect.objectContaining({
          Type: 'AWS::Cognito::UserPoolClient',
        }),
        TranscriptionsTable: expect.objectContaining({
          Type: 'AWS::DynamoDB::Table',
        }),
        AudioBucket: expect.objectContaining({
          Type: 'AWS::S3::Bucket',
        }),
        AudioBucketPolicy: expect.objectContaining({
          Type: 'AWS::S3::BucketPolicy',
        }),
      })
    );
  });

  it('uses the intended DynamoDB primary key design without an initial GSI', () => {
    const table = serverlessConfiguration.resources?.Resources?.TranscriptionsTable as {
      Properties?: {
        BillingMode?: string;
        AttributeDefinitions?: Array<{ AttributeName: string; AttributeType: string }>;
        KeySchema?: Array<{ AttributeName: string; KeyType: string }>;
        GlobalSecondaryIndexes?: unknown[];
      };
    };

    expect(table.Properties?.BillingMode).toBe('PAY_PER_REQUEST');
    expect(table.Properties?.AttributeDefinitions).toEqual(
      expect.arrayContaining([
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'transcriptionId', AttributeType: 'S' },
      ])
    );
    expect(table.Properties?.KeySchema).toEqual([
      { AttributeName: 'userId', KeyType: 'HASH' },
      { AttributeName: 'transcriptionId', KeyType: 'RANGE' },
    ]);
    expect(table.Properties?.GlobalSecondaryIndexes).toBeUndefined();
  });

  it('configures Cognito for email-based sign-in', () => {
    const userPool = serverlessConfiguration.resources?.Resources?.CognitoUserPool as {
      Properties?: {
        UserPoolName?: string;
        UsernameAttributes?: string[];
        AutoVerifiedAttributes?: string[];
        Policies?: {
          PasswordPolicy?: {
            MinimumLength?: number;
            RequireLowercase?: boolean;
            RequireNumbers?: boolean;
            RequireSymbols?: boolean;
            RequireUppercase?: boolean;
          };
        };
      };
    };

    expect(userPool.Properties?.UserPoolName).toBe('${self:service}-${self:provider.stage}-users');
    expect(userPool.Properties?.UsernameAttributes).toEqual(['email']);
    expect(userPool.Properties?.AutoVerifiedAttributes).toEqual(['email']);
    expect(userPool.Properties?.Policies?.PasswordPolicy).toEqual({
      MinimumLength: 8,
      RequireLowercase: true,
      RequireNumbers: true,
      RequireSymbols: false,
      RequireUppercase: true,
    });
  });

  it('configures the upload bucket with CORS and secure transport enforcement', () => {
    const bucket = serverlessConfiguration.resources?.Resources?.AudioBucket as {
      Properties?: {
        BucketName?: string;
        CorsConfiguration?: {
          CorsRules?: Array<{
            AllowedHeaders?: string[];
            AllowedMethods?: string[];
            AllowedOrigins?: string[];
            MaxAge?: number;
          }>;
        };
      };
    };

    const bucketPolicy = serverlessConfiguration.resources?.Resources?.AudioBucketPolicy as {
      Properties?: {
        Bucket?: { Ref: string };
        PolicyDocument?: {
          Statement?: Array<{
            Sid?: string;
            Effect?: string;
            Action?: string;
            Condition?: {
              Bool?: Record<string, boolean>;
            };
          }>;
        };
      };
    };

    expect(bucket.Properties?.BucketName).toBe(
      '${self:service}-${self:provider.stage}-audio-${aws:accountId}'
    );
    expect(bucket.Properties?.CorsConfiguration?.CorsRules).toEqual([
      {
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'PUT'],
        AllowedOrigins: ['*'],
        MaxAge: 3000,
      },
    ]);

    expect(bucketPolicy.Properties?.Bucket).toEqual({ Ref: 'AudioBucket' });
    expect(bucketPolicy.Properties?.PolicyDocument?.Statement).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Sid: 'DenyInsecureTransport',
          Effect: 'Deny',
          Action: 's3:*',
          Condition: {
            Bool: {
              'aws:SecureTransport': false,
            },
          },
        }),
      ])
    );
  });

  it('exports stack outputs needed by the frontend integration', () => {
    expect(serverlessConfiguration.resources?.Outputs).toEqual(
      expect.objectContaining({
        CognitoUserPoolId: { Value: { Ref: 'CognitoUserPool' } },
        CognitoUserPoolClientId: { Value: { Ref: 'CognitoUserPoolClient' } },
        TranscriptionsTableName: { Value: { Ref: 'TranscriptionsTable' } },
        AudioBucketName: { Value: { Ref: 'AudioBucket' } },
        AwsRegion: { Value: '${self:provider.region}' },
        Stage: { Value: '${self:provider.stage}' },
      })
    );
  });
});
