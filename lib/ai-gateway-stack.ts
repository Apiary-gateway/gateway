import { Stack, StackProps, Duration, RemovalPolicy, aws_logs, SecretValue } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dotenv from 'dotenv';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';

dotenv.config();

export class AiGatewayStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

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

    const llmApiKeys = new secretsmanager.Secret(this, 'LLMProviderKeys', {
      secretName: 'llm-provider-api-keys',
      secretObjectValue: {
        ANTHROPIC_API_KEY: SecretValue.unsafePlainText('your-api-key'),
        GEMINI_API_KEY: SecretValue.unsafePlainText('your-api-key'),
        OPENAI_API_KEY: SecretValue.unsafePlainText('your-api-key'),
      },
    });

    const routerFn = new lambdaNode.NodejsFunction(this, 'RouterFunction', {
      entry: 'lambda/router.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: Duration.seconds(30),
      bundling: {
        format: lambdaNode.OutputFormat.CJS,
        externalModules: [], 
        nodeModules: [],    
      },
      environment: {
        MESSAGE_TABLE_NAME: messageTable.tableName,
        METADATA_TABLE_NAME: metadataTable.tableName,
        SECRET_NAME: llmApiKeys.secretName,
        SYSTEM_PROMPT: `You are a helpful assistant. You answer in cockney.`,
      },
    });

    const apiGatewayLogRole = new iam.Role(this, "ApiGatewayCloudWatchRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      description: "IAM Role for API Gateway to push logs to CloudWatch",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs'),
      ],
    });

    const logGroup = new aws_logs.LogGroup(this, 'GatewayAccessLogs', {
      logGroupName: `/aws/apigateway/${id}/access-logs`,
      retention: aws_logs.RetentionDays.FOUR_MONTHS,
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

    const basicUsagePlan = api.addUsagePlan('BasicUsagePlan', {
      name: 'BasicUsagePlan',
      throttle: {
        rateLimit: 10, // 10 requests per second
        burstLimit: 20,
      },
    });

    basicUsagePlan.addApiKey(gatewayKey);
    basicUsagePlan.addApiStage({ stage: api.deploymentStage });
    
    llmApiKeys.grantRead(routerFn);

    const routerIntegration = new apigateway.LambdaIntegration(routerFn, {
      proxy: true,
    });
    const routeResource = api.root.addResource('route');
    routeResource.addMethod('POST', routerIntegration); 

    metadataTable.grantReadData(routerFn);
    messageTable.grantReadWriteData(routerFn);
  }
}
