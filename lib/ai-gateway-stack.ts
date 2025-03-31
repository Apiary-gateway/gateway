import { Construct } from 'constructs';
import {
  Aws,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNode,
  aws_apigateway as apigateway,
  aws_secretsmanager as secretsmanager,
  aws_dynamodb as dynamodb,
  aws_iam as iam,
  aws_logs as logs,
  aws_s3 as s3,
  aws_athena as athena,
  aws_opensearchserverless as opensearch,
  CfnOutput,
  CfnResource,
  Stack,
  StackProps,
  Duration,
  RemovalPolicy,
  SecretValue,
  Resource,
} from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import { timeStamp } from 'console';
import { ResourceType } from 'aws-cdk-lib/aws-config';
import { Permission } from '@aws-sdk/client-s3';

export class AiGatewayStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3 bucket for logs
    const logBucket = new s3.Bucket(this, 'LLMLogBucket', {
      removalPolicy: RemovalPolicy.DESTROY, // Bucket will be deleted with stack
      autoDeleteObjects: true, // Ensures all objects are deleted first
      lifecycleRules: [{ expiration: Duration.days(90) }],
    });

    // Broadened S3 bucket policy for Athena
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

    // Single DynamoDB table
    const aiGatewayLogsTable = new dynamodb.Table(this, 'AiGatewayLogsTable', {
      tableName: 'ai-gateway-logs-table',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Caching DynamoDB table
    const aiGatewayCacheTable = new dynamodb.Table(this, 'AiGatewayCacheTable', {
      tableName: 'ai-gateway-cache-table',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'cacheKey', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl', // Automatically remove expired items
    });

    // Security policy for OpenSearch Serverless collection for semantic cache
    const encryptionPolicy = new opensearch.CfnSecurityPolicy(this, 'OpenSearchEncryptionPolicy', {
      name: 'semantic-cache-encryption-policy',
      type: 'encryption',
      policy: JSON.stringify({
        Rules: [
          {
            ResourceType: 'collection',
            Resource: ['collection/semantic-cache']
          }
        ],
        AWSOwnedKey: true
      })
    });

    // TODO - make this more secure
    // allow public network access to OpenSearch
    const accessPolicy = new opensearch.CfnSecurityPolicy(this, 'PublicNetworkPolicy', {
      name: 'public-network-policy',
      type: 'network',
      policy: JSON.stringify([
        {
          Rules: [
            {
              ResourceType: 'collection',
              Resource: ['collection/semantic-cache'],
            },
          ],
          AllowFromPublic: true,
        },
      ]),
    });

    // OpenSearch Serverless collection for semantic cache
    const vectorCollection = new opensearch.CfnCollection(this, 'SemanticCacheCollection', {
      name: 'semantic-cache',
      type: 'VECTORSEARCH',
    });

    vectorCollection.node.addDependency(encryptionPolicy);
    vectorCollection.node.addDependency(accessPolicy);

    // IAM role for Lambda to invoke Bedrock models and access OpenSearch API
    const semanticCacheLambdaRole = new iam.Role(this, 'SemanticCacheLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ]
    });

    // Data access policy for OpenSearch collection
    // new opensearch.CfnAccessPolicy(this, 'OpenSearchAccessPolicy', {
    //   name: 'semantic-cache-access-policy',
    //   type: 'data',
    //   policy: JSON.stringify([
    //     {
    //       Rules: [
    //         {
    //           ResourceType: 'collection',
    //           // Resource: [`${vectorCollection.attrArn}`],
    //           Resource: [`collection/${vectorCollection.name}`],
    //           Permission: [
    //             // // TODO: try locking this down more? i.e. just the permissions below it
    //             "aoss:*",
    //             // // lets the Principal list metadata about the collection
    //             // "aoss:DescribeCollection",
    //             // "aoss:DescribeCollectionItems",
    //             // "aoss:DescribeIndex",
    //             // "aoss:ReadDocument",
    //             // "aoss:WriteDocument"
    //           ],
    //         },
    //         {
    //           ResourceType: 'index',
    //           // Resource: [`arn:aws:aoss:${this.region}:${this.account}:index/${vectorCollection.attrId}/*`],
    //           Resource: [`index/${vectorCollection.name}/*`],
    //           // TODO: lock this down more?
    //           Permission: [
    //             "aoss:*",
    //             // "aoss:DescribeCollection",
    //             // "aoss:DescribeCollectionItems",
    //             // "aoss:DescribeIndex",
    //             // "aoss:ReadDocument",
    //             // "aoss:WriteDocument"
    //           ]
    //         }
    //       ],
    //       // TODO: try locking this down more - specific Lambda function ARN, user ARNs
    //       Principal: [
    //         semanticCacheLambdaRole.roleArn,
    //         `arn:aws:iam::${Aws.ACCOUNT_ID}:root`, 
    //       ]
    //     }
    //   ])
    // });

    new opensearch.CfnAccessPolicy(this, 'OpenSearchAccessPolicy', {
      name: 'semantic-cache-access-policy',
      type: 'data',
      policy: "[{\"Description\":\"Full access\",\"Rules\":[{\"ResourceType\":\"index\",\"Resource\":[\"index/*/*\"],\"Permission\":[\"aoss:*\"]}, {\"ResourceType\":\"collection\",\"Resource\":[\"collection/semantic-cache\"],\"Permission\":[\"aoss:*\"]}],\"Principal\":[\"arn:aws:iam::313983287632:role/AiGatewayStack-SemanticCacheLambdaRole402D8BF4-a0NZRXBOtiA0\", \"arn:aws:iam::313983287632:root\"]}]"
    });

    semanticCacheLambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      // TODO: probably limit this to a specific Bedrock model(s)
      resources: ['*']
    }));    

    semanticCacheLambdaRole.addToPolicy(new iam.PolicyStatement({
      // full access to AWS OpenSearch Serverless API
      actions: [
        'aoss:ReadDocument',
        'aoss:WriteDocument',
        'aoss:DescribeCollectionItems',
        // Optional: helpful for debugging
        'aoss:DescribeCollection',
        'aoss:ListCollections',
        'aoss:APIAccessAll',
      ],
      // TODO: limit this more to specific resources?
      resources: [
        `arn:aws:aoss:${this.region}:${this.account}:*`,
        `arn:aws:aoss:${this.region}:${this.account}:collection/semantic-cache`,
        `arn:aws:aoss:${this.region}:${this.account}:index/semantic-cache/*`
      ]
    }));
    
    new CfnOutput(this, 'OpenSearchEndpoint', {
      value: `${vectorCollection.attrCollectionEndpoint}`,
      exportName: 'OpenSearchCollectionEndpoint',
    });

    new CfnOutput(this, 'OpenSearchCollectionAttrId', {
      value: `${vectorCollection.attrId}`,
      exportName: 'OpenSearchCollectionAttrId',
    });

    // Secrets Manager for API keys
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
    athenaWorkgroup.applyRemovalPolicy(RemovalPolicy.RETAIN); // Retain for custom cleanup

    // Custom resource to delete Athena workgroup before bucket
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

    // Ensure bucket depends on Athena cleanup to avoid new writes during deletion
    logBucket.node.addDependency(athenaCleanup);

    // Glue Database
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

    // Glue Table for Athena
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

    // Router Lambda function
    const routerFn = new lambdaNode.NodejsFunction(this, 'RouterFunction', {
      entry: 'lambda/router.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: Duration.seconds(30),
      role: semanticCacheLambdaRole,
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
        CACHE_TABLE_NAME: aiGatewayCacheTable.tableName,
        OPENSEARCH_ENDPOINT: vectorCollection.attrCollectionEndpoint,
        OPENSEARCH_INDEX: 'semantic-cache-index',
      },
    });

    // Logs Lambda function
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
      throttle: { rateLimit: 10, burstLimit: 20 },
    });
    usagePlan.addApiKey(gatewayKey);
    usagePlan.addApiStage({ stage: api.deploymentStage });

    // Permissions for Router Lambda
    aiGatewayCacheTable.grantReadWriteData(routerFn);
    aiGatewayLogsTable.grantReadWriteData(routerFn);
    llmApiKeys.grantRead(routerFn);
    logBucket.grantReadWrite(routerFn);

    // Permissions for Logs Lambda
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

    // API routes
    const routerIntegration = new apigateway.LambdaIntegration(routerFn);
    const routeResource = api.root.addResource('route');
    routeResource.addMethod('POST', routerIntegration, {
      apiKeyRequired: true,
    });

    const logsIntegration = new apigateway.LambdaIntegration(logsFn);
    const logsResource = api.root.addResource('logs');
    logsResource.addMethod('GET', logsIntegration, { apiKeyRequired: false });
  }
}
