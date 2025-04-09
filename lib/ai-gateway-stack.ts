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
  aws_s3_deployment as s3deploy,
  CfnResource,
  Stack,
  StackProps,
  Duration,
  RemovalPolicy,
  SecretValue,
  Resource,
  CustomResource,
} from 'aws-cdk-lib';
// ✅ Add these imports for scheduling
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

import * as cr from 'aws-cdk-lib/custom-resources';
import { timeStamp } from 'console';
import { ResourceType } from 'aws-cdk-lib/aws-config';
import { Permission } from '@aws-sdk/client-s3';
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

    const messageTable = new dynamodb.Table(this, 'LLMMessageTable', {
      partitionKey: { name: 'threadID', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // DynamoDB table
    const aiGatewayLogsTable = new dynamodb.Table(this, 'AiGatewayLogsTable', {
      tableName: 'ai-gateway-logs-table',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Simple caching DynamoDB table
    const aiGatewayCacheTable = new dynamodb.Table(
      this,
      'AiGatewayCacheTable',
      {
        tableName: 'ai-gateway-cache-table',
        partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'cacheKey', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY,
        timeToLiveAttribute: 'ttl', // Automatically remove expired items
      }
    );

    // SEMANTIC CACHE / GUARDRAILS ITEMS START
    // Security policy for OpenSearch Serverless collection for semantic cache
    // const encryptionPolicy = new opensearch.CfnSecurityPolicy(this, 'OpenSearchEncryptionPolicy', {
    //   name: 'semantic-cache-encryption-policy',
    //   type: 'encryption',
    //   policy: JSON.stringify({
    //     Rules: [
    //       {
    //         ResourceType: 'collection',
    //         Resource: ['collection/semantic-cache']
    //       }
    //     ],
    //     AWSOwnedKey: true
    //   })
    // });

    // const guardrailsBucket = new s3.Bucket(this, 'GuardrailsBucket', {
    //   bucketName: 'ai-guardrails-bucket', 
    //   removalPolicy: RemovalPolicy.DESTROY,
    //   autoDeleteObjects: true,
    //   publicReadAccess: false,
    //   blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    // });

    // new s3deploy.BucketDeployment(this, 'DeployGuardrailsJson', {
    //   sources: [s3deploy.Source.asset(path.join(__dirname, '../lambda/json'))],
    //   destinationBucket: guardrailsBucket,
    //   destinationKeyPrefix: '', 
    // });

    // // allow public network access to OpenSearch - tighten this down?
    // const accessPolicy = new opensearch.CfnSecurityPolicy(this, 'PublicNetworkPolicy', {
    //   name: 'public-network-policy',
    //   type: 'network',
    //   policy: JSON.stringify([
    //     {
    //       Rules: [
    //         {
    //           ResourceType: 'collection',
    //           Resource: ['collection/semantic-cache'],
    //         },
    //       ],
    //       AllowFromPublic: true,
    //     },
    //   ]),
    // });

    // // OpenSearch Serverless collection for semantic cache
    // const vectorCollection = new opensearch.CfnCollection(this, 'SemanticCacheCollection', {
    //   name: 'semantic-cache',
    //   type: 'VECTORSEARCH',
    //   // "dev-test mode" - disabling replicas should cut cost in half
    //   standbyReplicas: 'DISABLED',
    // });

    // vectorCollection.node.addDependency(encryptionPolicy);
    // vectorCollection.node.addDependency(accessPolicy);

    // // IAM role for Lambda to invoke Bedrock models and access OpenSearch API
    // const semanticCacheLambdaRole = new iam.Role(this, 'SemanticCacheLambdaRole', {
    //   assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    //   managedPolicies: [
    //     iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
    //   ]
    // });

    // new opensearch.CfnAccessPolicy(this, 'OpenSearchAccessPolicy', {
    //   name: 'semantic-cache-access-policy',
    //   type: 'data',
    //   policy: JSON.stringify([
    //     {
    //       Rules: [
    //         {
    //           ResourceType: "collection",
    //           Resource: [`collection/${vectorCollection.name}`],
    //           Permission: ["aoss:*"],
    //         },
    //         {
    //           ResourceType: "index",
    //           Resource: ["index/*/*"],
    //           Permission: ["aoss:*"]
    //         }
    //       ],
    //       Principal: [
    //         semanticCacheLambdaRole.roleArn,
    //         `arn:aws:iam::${Aws.ACCOUNT_ID}:root`,
    //       ]
    //     }
    //   ])
    // });

    // semanticCacheLambdaRole.addToPolicy(new iam.PolicyStatement({
    //   actions: ['bedrock:InvokeModel'],
    //   // TODO: limit this to a specific Bedrock model(s)?
    //   resources: ['*']
    // }));

    // semanticCacheLambdaRole.addToPolicy(new iam.PolicyStatement({
    //   actions: [
    //     'aoss:ReadDocument',
    //     'aoss:WriteDocument',
    //     'aoss:DescribeCollectionItems',
    //     'aoss:DescribeCollection',
    //     'aoss:ListCollections',
    //     'aoss:DescribeIndex',
    //     'aoss:ListIndexes',
    //     'aoss:APIAccessAll',
    //     's3:GetObject',
    //     's3:ListBucket',
    //   ],
    //   // TODO: limit this more to specific resources?
    //   resources: [
    //     `arn:aws:aoss:${this.region}:${this.account}:*`,
    //     `arn:aws:aoss:${this.region}:${this.account}:collection/semantic-cache`,
    //     `arn:aws:aoss:${this.region}:${this.account}:index/semantic-cache/*`,
    //     `arn:aws:aoss:${this.region}:${this.account}:index/guardrails-index/*`, // added for guardrails
    //     'arn:aws:s3:::ai-guardrails-bucket',
    //     'arn:aws:s3:::ai-guardrails-bucket/guardrailUtterances.json'
    //   ]
    // }));
    
    // new CfnOutput(this, 'OpenSearchEndpoint', {
    //   value: `${vectorCollection.attrCollectionEndpoint}`,
    //   exportName: 'OpenSearchCollectionEndpoint',
    // });

    // new CfnOutput(this, 'OpenSearchCollectionAttrId', {
    //   value: `${vectorCollection.attrId}`,
    //   exportName: 'OpenSearchCollectionAttrId',
    // });

    // const createVectorIndexFn = new lambdaNode.NodejsFunction(this, 'CreateVectorIndexFunction', {
    //   entry: 'lambda/vectorIndex.ts',
    //   handler: 'handler',
    //   runtime: lambda.Runtime.NODEJS_18_X,
    //   timeout: Duration.minutes(5),
    //   role: semanticCacheLambdaRole,
    //   bundling: {
    //     format: lambdaNode.OutputFormat.CJS,
    //     externalModules: ['aws-sdk'],
    //   },
    //   environment: {
    //     OPENSEARCH_ENDPOINT: vectorCollection.attrCollectionEndpoint,
    //     OPENSEARCH_INDEX: 'semantic-cache-index',
    //     GUARDRAIL_UTTERANCES_S3_URI: 's3://ai-guardrails-bucket/guardrailUtterances.json'
    //   },
    // });

    // const provider = new cr.Provider(this, 'CreateVectorIndexProvider', {
    //   onEventHandler: createVectorIndexFn,
    //   logGroup: new logs.LogGroup(this, 'CRProviderLogs', {
    //     retention: logs.RetentionDays.FIVE_DAYS
    //   }),
    // });

    // const createVectorIndex = new CustomResource(this, 'CreateVectorIndex', {
    //   serviceToken: provider.serviceToken,
    //   serviceTimeout: Duration.seconds(900), // 15 min
    //   // should invoke Lambda again if either of these properties change
    //   properties: {
    //     collectionName: vectorCollection.name,
    //     indexName: 'semantic-cache-index',
    //     dimension: 1024,
    //   },
    // });

    // // custom resource for guardrails index
    // const createGuardrailsIndex = new CustomResource(this, 'CreateGuardrailsIndex', {
    //   serviceToken: provider.serviceToken,
    //   serviceTimeout: Duration.seconds(900), // 15 min
    //   // should invoke Lambda again if either of these properties change
    //   properties: {
    //     collectionName: vectorCollection.name,
    //     indexName: 'guardrails-index',
    //     dimension: 1024,
    //     mappings: JSON.stringify({
    //       properties: {
    //         embedding: {
    //           type: "knn_vector",
    //           dimension: 1024,
    //           method: {
    //             engine: "nmslib", // non-metric space library (approx. nn search library)
    //             space_type: "cosinesimil",
    //             name: "hnsw", // heirarchical navigable small world (graph-based ann algorithm)
    //             parameters: {}
    //           }
    //         },
    //         text: { type: "text" }, // TODO include category here?
    //       }
    //     }),
    //     guardrailsBucket: guardrailsBucket.bucketName,
    //     guardrailsKey: 'guardrailUtterances.json'
    //   },
    // });

    // createVectorIndex.node.addDependency(vectorCollection);
    // createGuardrailsIndex.node.addDependency(vectorCollection);
    // guardrailsBucket.grantRead(semanticCacheLambdaRole);
    // SEMANTIC CACHE / GUARDRAILS ITEMS END

    // Bucket for config file
    const configBucket = new s3.Bucket(this, 'ConfigBucket', {
      bucketName: 'gateway-config-bucket',
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Secrets Manager for API Keys
    const llmApiKeys = new secretsmanager.Secret(this, 'LLMProviderKeys', {
      secretName: 'llm-provider-api-keys',
      secretObjectValue: {
        ANTHROPIC_API_KEY: SecretValue.unsafePlainText('your-api-key'),
        GEMINI_API_KEY: SecretValue.unsafePlainText('your-api-key'),
        OPENAI_API_KEY: SecretValue.unsafePlainText('your-api-key'),
      },
      removalPolicy: RemovalPolicy.DESTROY,
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
    athenaWorkgroup.applyRemovalPolicy(RemovalPolicy.DESTROY);

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
            classification: 'parquet',
            'projection.enabled': 'true',
            'projection.is_successful.type': 'enum',
            'projection.is_successful.values': 'true,false',
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
            'storage.location.template': `s3://${logBucket.bucketName}/logs/parquet/is_successful=\${is_successful}/date=\${date}/provider=\${provider}/model=\${model}/`,
          },
          StorageDescriptor: {
            Columns: [
              { Name: 'id', Type: 'string' },
              { Name: 'timestamp', Type: 'timestamp' },
              { Name: 'latency', Type: 'bigint' },
              { Name: 'success_reason', Type: 'string' },
              { Name: 'error_reason', Type: 'string' },
              { Name: 'model_routing_history', Type: 'string' },
              { Name: 'user_id', Type: 'string' },
              { Name: 'metadata', Type: 'string' },
              { Name: 'thread_id', Type: 'string' },
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
            { Name: 'is_successful', Type: 'string' },
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
        MESSAGE_TABLE_NAME: messageTable.tableName,
        SYSTEM_PROMPT: 'You are a helpful assistant. You answer in cockney.',
        LOG_BUCKET_NAME: logBucket.bucketName,
        CACHE_TABLE_NAME: aiGatewayCacheTable.tableName,
        // OPENSEARCH_ENDPOINT: vectorCollection.attrCollectionEndpoint,
        OPENSEARCH_INDEX: 'semantic-cache-index',
        OPENSEARCH_GUARDRAILS_INDEX: 'guardrails-index',
        CONFIG_BUCKET_NAME: configBucket.bucketName,
      },
    });

    routerFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['scheduler:CreateSchedule', 'iam:PassRole'],
        resources: ['*'],
      })
    );

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

    // === NEW: Migrate Logs Lambda ===
    const migrateLogsFn = new lambdaNode.NodejsFunction(
      this,
      'MigrateLogsFunction',
      {
        entry: 'lambda/migrateLogs.ts', // your newly created file
        handler: 'handler',
        runtime: lambda.Runtime.NODEJS_18_X,
        timeout: Duration.minutes(5),
        bundling: {
          format: lambdaNode.OutputFormat.CJS,
          externalModules: ['aws-sdk'],
        },
        environment: {
          LOG_TABLE_NAME: aiGatewayLogsTable.tableName,
          LOG_BUCKET_NAME: logBucket.bucketName,
        },
      }
    );
    aiGatewayLogsTable.grantReadWriteData(migrateLogsFn);
    logBucket.grantReadWrite(migrateLogsFn);

    // === Schedule to run every 5 minutes ===
    new Rule(this, 'MigrateLogsScheduleRule', {
      schedule: Schedule.rate(Duration.minutes(5)),
      targets: [new LambdaFunction(migrateLogsFn)],
    });

    // API Gateway with Cloudwatch logs
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

    // Permissions
    aiGatewayCacheTable.grantReadWriteData(routerFn);
    aiGatewayLogsTable.grantReadWriteData(routerFn);
    llmApiKeys.grantRead(routerFn);
    logBucket.grantReadWrite(routerFn);
    aiGatewayLogsTable.grantReadData(logsFn);
    messageTable.grantReadWriteData(routerFn);
    logBucket.grantReadWrite(logsFn);
    configBucket.grantRead(routerFn);

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
    const logsIntegration = new apigateway.LambdaIntegration(logsFn); // Proxy: true by default
    logsResource.addMethod('GET', logsIntegration, {
      apiKeyRequired: false,
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

    // Deploy frontend from /frontend-ui/dist
    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [
        s3deploy.Source.asset(
          path.join(__dirname, '..', 'frontend-ui', 'dist') // <-- adapt path if needed
        ),
        s3deploy.Source.data('config.js', configJsContent),
      ],
      destinationBucket: frontendBucket,
    });

    // NEW: Output the deployed website URL of the S3 frontend bucket
    new CfnOutput(this, 'FrontendBucketUrl', {
      value: frontendBucket.bucketWebsiteUrl,
      description: 'URL for the deployed frontend S3 bucket website',
    });

    // encryptionPolicy.applyRemovalPolicy(RemovalPolicy.DESTROY);
    // accessPolicy.applyRemovalPolicy(RemovalPolicy.DESTROY);
    // vectorCollection.applyRemovalPolicy(RemovalPolicy.DESTROY);
    athenaDatabase.applyRemovalPolicy(RemovalPolicy.DESTROY);
    athenaTable.applyRemovalPolicy(RemovalPolicy.DESTROY);
    // createVectorIndex.applyRemovalPolicy(RemovalPolicy.DESTROY);
    // createGuardrailsIndex.applyRemovalPolicy(RemovalPolicy.DESTROY);

  }
}
