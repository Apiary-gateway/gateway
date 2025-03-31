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
  aws_athena as athena,
  aws_s3_deployment as s3deploy,
  CfnResource,
  Stack,
  StackProps,
  Duration,
  RemovalPolicy,
  SecretValue,
} from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as path from 'path';

export class AiGatewayStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3 bucket for logs
    const logBucket = new s3.Bucket(this, 'LLMLogBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [{ expiration: Duration.days(90) }],
    });

    logBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: [
          's3:PutObject',
          's3:GetObject',
          's3:ListBucket',
          's3:GetBucketLocation',
        ],
        principals: [new iam.ServicePrincipal('athena.amazonaws.com')],
        resources: [logBucket.bucketArn, `${logBucket.bucketArn}/*`],
      })
    );

    // DynamoDB table
    const aiGatewayLogsTable = new dynamodb.Table(this, 'AiGatewayLogsTable', {
      tableName: 'ai-gateway-logs-table',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
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

    // Athena workgroup
    const athenaWorkgroupName = `${this.stackName}-llm_logs_workgroup`;
    const athenaWorkgroup = new athena.CfnWorkGroup(this, 'AthenaWorkgroup', {
      name: athenaWorkgroupName,
      state: 'ENABLED',
      workGroupConfiguration: {
        resultConfiguration: {
          outputLocation: `s3://${logBucket.bucketName}/athena-results/`,
        },
      },
    });
    athenaWorkgroup.applyRemovalPolicy(RemovalPolicy.RETAIN);

    const athenaCleanup = new cr.AwsCustomResource(
      this,
      'AthenaWorkgroupCleanup',
      {
        onDelete: {
          service: 'Athena',
          action: 'deleteWorkGroup',
          parameters: {
            WorkGroup: athenaWorkgroupName,
            RecursiveDeleteOption: true,
          },
          physicalResourceId: cr.PhysicalResourceId.of(athenaWorkgroupName),
        },
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
          resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
        removalPolicy: RemovalPolicy.DESTROY,
      }
    );
    logBucket.node.addDependency(athenaCleanup);

    // Glue Database and Table
    const athenaDatabase = new CfnResource(this, 'AthenaDatabase', {
      type: 'AWS::Glue::Database',
      properties: {
        CatalogId: this.account,
        DatabaseInput: {
          Name: 'ai_gateway_logs_db',
          Description: 'Database for AI Gateway logs',
        },
      },
    });

    const athenaTable = new CfnResource(this, 'AIGatewayLogsTable', {
      type: 'AWS::Glue::Table',
      properties: {
        CatalogId: this.account,
        DatabaseName: 'ai_gateway_logs_db',
        TableInput: {
          Name: 'ai_gateway_logs',
          TableType: 'EXTERNAL_TABLE',
          Parameters: {
            'projection.enabled': 'true',
            'projection.status.type': 'enum',
            'projection.status.values': 'success,failure',
            'projection.date.type': 'date',
            'projection.date.range': '2025-01-01,NOW',
            'projection.date.format': 'yyyy-MM-dd',
            'projection.date.interval': '1',
            'projection.date.interval.unit': 'DAYS',
            'projection.provider.type': 'enum',
            'projection.provider.values': 'openai,anthropic,gemini,unknown',
            'projection.model.type': 'enum',
            'projection.model.values':
              'gpt-3.5-turbo,gpt-4,claude-3-opus-20240229,gemini-1.5-pro,unknown',
            'storage.location.template': `s3://${logBucket.bucketName}/logs/parquet/status=\${status}/date=\${date}/provider=\${provider}/model=\${model}/`,
          },
          StorageDescriptor: {
            Columns: [
              { Name: 'id', Type: 'string' },
              { Name: 'thread_ts', Type: 'string' },
              { Name: 'timestamp', Type: 'string' },
              { Name: 'latency', Type: 'bigint' },
              { Name: 'tokens_used', Type: 'bigint' },
              { Name: 'cost', Type: 'double' },
              { Name: 'raw_request', Type: 'string' },
              { Name: 'raw_response', Type: 'string' },
              { Name: 'error_message', Type: 'string' },
            ],
            Location: `s3://${logBucket.bucketName}/logs/parquet/`,
            InputFormat:
              'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
            OutputFormat:
              'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
            SerdeInfo: {
              SerializationLibrary:
                'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe',
            },
          },
          PartitionKeys: [
            { Name: 'status', Type: 'string' },
            { Name: 'date', Type: 'string' },
            { Name: 'provider', Type: 'string' },
            { Name: 'model', Type: 'string' },
          ],
        },
      },
    });
    athenaTable.addDependency(athenaDatabase);
    athenaDatabase.addDependency(athenaWorkgroup);
    logBucket.grantRead(new iam.ServicePrincipal('athena.amazonaws.com'));

    // Router Lambda
    const routerFn = new lambdaNode.NodejsFunction(this, 'RouterFunction', {
      entry: 'lambda/router.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: Duration.seconds(30),
      bundling: {
        format: lambdaNode.OutputFormat.CJS,
        externalModules: ['aws-sdk'],
        nodeModules: ['@smithy/util-utf8'],
      },
      environment: {
        LOG_TABLE_NAME: aiGatewayLogsTable.tableName,
        SECRET_NAME: llmApiKeys.secretName,
        SYSTEM_PROMPT: 'You are a helpful assistant. You answer in cockney.',
        LOG_BUCKET_NAME: logBucket.bucketName,
      },
    });

    // Logs Lambda
    const logsFn = new lambdaNode.NodejsFunction(this, 'LogsFunction', {
      entry: 'lambda/logs.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: Duration.minutes(3),
      bundling: {
        format: lambdaNode.OutputFormat.CJS,
        externalModules: ['aws-sdk'],
      },
      environment: {
        LOG_TABLE_NAME: aiGatewayLogsTable.tableName,
        LOG_BUCKET_NAME: logBucket.bucketName,
        ATHENA_WORKGROUP: athenaWorkgroupName,
      },
    });

    // API Gateway with CORS
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
        // cacheClusterEnabled: true,
        // cacheClusterSize: '0.5', // GB - valid values are 0.5 | 1.6 | 6.1 | 13.5 | 28.4 | 58.2 | 118 | 237
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
      throttle: { rateLimit: 10, burstLimit: 20 },
    });
    usagePlan.addApiKey(gatewayKey);
    usagePlan.addApiStage({ stage: api.deploymentStage });

    // Permissions
    aiGatewayLogsTable.grantReadWriteData(routerFn);
    llmApiKeys.grantRead(routerFn);
    logBucket.grantReadWrite(routerFn);
    aiGatewayLogsTable.grantReadData(logsFn);
    logBucket.grantReadWrite(logsFn);
    logsFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'athena:StartQueryExecution',
          'athena:GetQueryExecution',
          'athena:GetQueryResults',
          'athena:ListWorkGroups',
          'athena:GetWorkGroup',
        ],
        resources: [
          `arn:aws:athena:${this.region}:${this.account}:workgroup/${athenaWorkgroupName}`,
        ],
      })
    );
    logsFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:ListBucket',
          's3:GetBucketLocation',
        ],
        resources: [
          `arn:aws:s3:::${logBucket.bucketName}`,
          `arn:aws:s3:::${logBucket.bucketName}/*`,
        ],
      })
    );
    logsFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'glue:GetTable',
          'glue:GetTables',
          'glue:GetDatabase',
          'glue:GetDatabases',
          'glue:GetPartition',
          'glue:GetPartitions',
        ],
        resources: [
          `arn:aws:glue:${this.region}:${this.account}:catalog`,
          `arn:aws:glue:${this.region}:${this.account}:database/ai_gateway_logs_db`,
          `arn:aws:glue:${this.region}:${this.account}:table/ai_gateway_logs_db/ai_gateway_logs`,
        ],
      })
    );

    // API routes with explicit CORS configuration
    const routerIntegration = new apigateway.LambdaIntegration(routerFn);
    const routeResource = api.root.addResource('route');
    routeResource.addMethod('POST', routerIntegration, {
      apiKeyRequired: true,
    });

    const logsResource = api.root.addResource('logs');

    // Lambda integration for GET with CORS headers
    const logsIntegration = new apigateway.LambdaIntegration(logsFn, {
      proxy: false, // Non-proxy to control response
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers':
              "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'",
          },
        },
        {
          statusCode: '500', // Handle errors
          selectionPattern: '5\\d{2}',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers':
              "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'",
          },
        },
      ],
    });

    // GET method with CORS response
    logsResource.addMethod('GET', logsIntegration, {
      apiKeyRequired: false,
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
          },
        },
        {
          statusCode: '500',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
          },
        },
      ],
    });

    // OPTIONS method for CORS preflight
    const optionsIntegration = new apigateway.MockIntegration({
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers':
              "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'",
            'method.response.header.Access-Control-Allow-Methods':
              "'GET,OPTIONS'",
          },
        },
      ],
      passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    });

    logsResource.addMethod('OPTIONS', optionsIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
          },
        },
      ],
    });

    // S3 Bucket for Frontend
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
    });

    frontendBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [`${frontendBucket.bucketArn}/*`],
        principals: [new iam.AnyPrincipal()],
      })
    );

    // Define the logs endpoint
    const logsEndpoint = `${api.url}logs`;

    // Inject the endpoint via config.js
    const configJsContent = `
      window.LOGS_ENDPOINT = ${JSON.stringify(logsEndpoint)};
    `;

    // Deploy frontend
    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, '..', 'frontend', 'build')),
        s3deploy.Source.data('config.js', configJsContent),
      ],
      destinationBucket: frontendBucket,
    });
  }
}
