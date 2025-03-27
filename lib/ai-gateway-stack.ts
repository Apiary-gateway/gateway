import { Construct } from 'constructs';
import {
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNode,
  aws_apigateway as apigateway,
  aws_secretsmanager as secretsmanager,
  aws_dynamodb as dynamodb,
  aws_iam as iam,
  aws_logs as logs,
  aws_s3 as s3,
  Stack,
  StackProps,
  Duration,
  RemovalPolicy,
  SecretValue,
} from 'aws-cdk-lib';

export class AiGatewayStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3 bucket for logs
    const logBucket = new s3.Bucket(this, 'LLMLogBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: Duration.days(90),
        },
      ],
    });

    // Secrets Manager
    const llmApiKeys = new secretsmanager.Secret(this, 'LLMProviderKeys', {
      secretName: 'llm-provider-api-keys',
      secretObjectValue: {
        ANTHROPIC_API_KEY: SecretValue.unsafePlainText('your-api-key'),
        GEMINI_API_KEY: SecretValue.unsafePlainText('your-api-key'),
        OPENAI_API_KEY: SecretValue.unsafePlainText('your-api-key'),
      },
    });

    // DynamoDB tables
    const metadataTable = new dynamodb.Table(this, 'LLMMetadataTable', {
      partitionKey: { name: 'provider', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'modelName', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const messageTable = new dynamodb.Table(this, 'LLMMessageTable', {
      partitionKey: { name: 'threadID', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Lambda function
    const routerFn = new lambdaNode.NodejsFunction(this, 'RouterFunction', {
      entry: 'lambda/router.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: Duration.seconds(30),
      bundling: {
        format: lambdaNode.OutputFormat.CJS,
        externalModules: ['aws-sdk'], // Exclude only AWS SDK v2
        nodeModules: ['@smithy/util-utf8'], // ✅ Include the problematic dependency
      },
      environment: {
        MESSAGE_TABLE_NAME: messageTable.tableName,
        METADATA_TABLE_NAME: metadataTable.tableName,
        SECRET_NAME: llmApiKeys.secretName,
        SYSTEM_PROMPT: `You are a helpful assistant. You answer in cockney.`,
        LOG_BUCKET_NAME: logBucket.bucketName,
      },
    });

    // API Gateway logging setup
    const apiGatewayLogRole = new iam.Role(this, 'ApiGatewayCloudWatchRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonAPIGatewayPushToCloudWatchLogs'
        ),
      ],
    });

    const logGroup = new logs.LogGroup(this, 'GatewayAccessLogs', {
      logGroupName: `/aws/apigateway/${id}/access-logs`,
      retention: logs.RetentionDays.FOUR_MONTHS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const api = new apigateway.RestApi(this, 'AiGatewayRestApi', {
      restApiName: 'AI Gateway API',
      description: 'Routes requests to the appropriate LLM service.',
      apiKeySourceType: apigateway.ApiKeySourceType.HEADER,
      deployOptions: {
        stageName: 'dev',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
      },
    });

    const cfnAccount = new apigateway.CfnAccount(this, 'ApiGatewayAccount', {
      cloudWatchRoleArn: apiGatewayLogRole.roleArn,
    });

    cfnAccount.node.addDependency(apiGatewayLogRole);
    api.node.addDependency(cfnAccount);

    const gatewayKey = new apigateway.ApiKey(this, 'GatewayKey', {
      apiKeyName: 'gateway-api-key',
      enabled: true,
    });

    const usagePlan = api.addUsagePlan('BasicUsagePlan', {
      name: 'BasicUsagePlan',
      throttle: {
        rateLimit: 10,
        burstLimit: 20,
      },
    });

    usagePlan.addApiKey(gatewayKey);
    usagePlan.addApiStage({ stage: api.deploymentStage });

    // Permissions
    metadataTable.grantReadData(routerFn);
    messageTable.grantReadWriteData(routerFn);
    llmApiKeys.grantRead(routerFn);
    logBucket.grantWrite(routerFn);
    logBucket.grantPut(routerFn);

    // API route
    const routerIntegration = new apigateway.LambdaIntegration(routerFn);
    const routeResource = api.root.addResource('route');

    routeResource.addMethod('POST', routerIntegration, {
      apiKeyRequired: true,
    });
  }
}
