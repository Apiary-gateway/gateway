"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiGatewayStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
// ✅ Add these imports for scheduling
const aws_events_1 = require("aws-cdk-lib/aws-events");
const aws_events_targets_1 = require("aws-cdk-lib/aws-events-targets");
const cr = __importStar(require("aws-cdk-lib/custom-resources"));
const path = __importStar(require("path"));
class AiGatewayStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // S3 bucket for logs
        const logBucket = new aws_cdk_lib_1.aws_s3.Bucket(this, 'LLMLogBucket', {
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            lifecycleRules: [{ expiration: aws_cdk_lib_1.Duration.days(90) }],
        });
        logBucket.addToResourcePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            actions: [
                's3:PutObject',
                's3:GetObject',
                's3:ListBucket',
                's3:GetBucketLocation',
            ],
            principals: [new aws_cdk_lib_1.aws_iam.ServicePrincipal('athena.amazonaws.com')],
            resources: [logBucket.bucketArn, `${logBucket.bucketArn}/*`],
        }));
        const messageTable = new aws_cdk_lib_1.aws_dynamodb.Table(this, 'LLMMessageTable', {
            partitionKey: { name: 'threadID', type: aws_cdk_lib_1.aws_dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: aws_cdk_lib_1.aws_dynamodb.AttributeType.NUMBER },
            billingMode: aws_cdk_lib_1.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        // DynamoDB table
        const aiGatewayLogsTable = new aws_cdk_lib_1.aws_dynamodb.Table(this, 'AiGatewayLogsTable', {
            tableName: 'ai-gateway-logs-table',
            partitionKey: { name: 'PK', type: aws_cdk_lib_1.aws_dynamodb.AttributeType.STRING },
            sortKey: { name: 'SK', type: aws_cdk_lib_1.aws_dynamodb.AttributeType.STRING },
            billingMode: aws_cdk_lib_1.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        // Simple caching DynamoDB table
        const aiGatewayCacheTable = new aws_cdk_lib_1.aws_dynamodb.Table(this, 'AiGatewayCacheTable', {
            tableName: 'ai-gateway-cache-table',
            partitionKey: { name: 'userId', type: aws_cdk_lib_1.aws_dynamodb.AttributeType.STRING },
            sortKey: { name: 'cacheKey', type: aws_cdk_lib_1.aws_dynamodb.AttributeType.STRING },
            billingMode: aws_cdk_lib_1.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            timeToLiveAttribute: 'ttl', // Automatically remove expired items
        });
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
        // s3 Bucket for config file
        const configBucket = new aws_cdk_lib_1.aws_s3.Bucket(this, 'ConfigBucket', {
            bucketName: 'gateway-config-bucket',
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            cors: [
                {
                    allowedOrigins: ['*'], // or set to your frontend URL
                    allowedMethods: [aws_cdk_lib_1.aws_s3.HttpMethods.GET, aws_cdk_lib_1.aws_s3.HttpMethods.PUT],
                    allowedHeaders: ['*'],
                    exposedHeaders: ['ETag'],
                },
            ],
        });
        new aws_cdk_lib_1.aws_s3_deployment.BucketDeployment(this, 'DeployDefaultConfig', {
            sources: [aws_cdk_lib_1.aws_s3_deployment.Source.asset(path.join(__dirname, '../lambda/util/defaultConfig'))],
            destinationBucket: configBucket,
            destinationKeyPrefix: 'configs/',
        });
        // Secrets Manager for API Keys
        const llmApiKeys = new aws_cdk_lib_1.aws_secretsmanager.Secret(this, 'LLMProviderKeys', {
            secretName: 'llm-provider-api-keys',
            secretObjectValue: {
                ANTHROPIC_API_KEY: aws_cdk_lib_1.SecretValue.unsafePlainText('your-api-key'),
                GEMINI_API_KEY: aws_cdk_lib_1.SecretValue.unsafePlainText('your-api-key'),
                OPENAI_API_KEY: aws_cdk_lib_1.SecretValue.unsafePlainText('your-api-key'),
            },
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        // Athena workgroup
        const athenaWorkgroupName = `${this.stackName}-llm_logs_workgroup`;
        const athenaWorkgroup = new aws_cdk_lib_1.aws_athena.CfnWorkGroup(this, 'AthenaWorkgroup', {
            name: athenaWorkgroupName,
            state: 'ENABLED',
            workGroupConfiguration: {
                resultConfiguration: {
                    outputLocation: `s3://${logBucket.bucketName}/athena-results/`,
                },
            },
        });
        athenaWorkgroup.applyRemovalPolicy(aws_cdk_lib_1.RemovalPolicy.DESTROY);
        const athenaCleanup = new cr.AwsCustomResource(this, 'AthenaWorkgroupCleanup', {
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
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        logBucket.node.addDependency(athenaCleanup);
        // Glue Database and Table
        const athenaDatabase = new aws_cdk_lib_1.CfnResource(this, 'AthenaDatabase', {
            type: 'AWS::Glue::Database',
            properties: {
                CatalogId: this.account,
                DatabaseInput: {
                    Name: 'ai_gateway_logs_db',
                    Description: 'Database for AI Gateway logs',
                },
            },
        });
        const athenaTable = new aws_cdk_lib_1.CfnResource(this, 'AIGatewayLogsTable', {
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
                        'projection.model.values': 'gpt-3.5-turbo,gpt-4,claude-3-opus-20240229,gemini-1.5-pro,unknown',
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
                        InputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
                        OutputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
                        SerdeInfo: {
                            SerializationLibrary: 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe',
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
        logBucket.grantRead(new aws_cdk_lib_1.aws_iam.ServicePrincipal('athena.amazonaws.com'));
        // Router Lambda
        const routerFn = new aws_cdk_lib_1.aws_lambda_nodejs.NodejsFunction(this, 'RouterFunction', {
            entry: 'lambda/router.ts',
            handler: 'handler',
            runtime: aws_cdk_lib_1.aws_lambda.Runtime.NODEJS_18_X,
            timeout: aws_cdk_lib_1.Duration.seconds(30),
            bundling: {
                format: aws_cdk_lib_1.aws_lambda_nodejs.OutputFormat.CJS,
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
        routerFn.addToRolePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            actions: ['scheduler:CreateSchedule', 'iam:PassRole'],
            resources: ['*'],
        }));
        // Get and Put Config Lambda
        const presignedUrlLambda = new aws_cdk_lib_1.aws_lambda_nodejs.NodejsFunction(this, 'PresignedUrlConfigLambda', {
            entry: path.join(__dirname, '../lambda/presignedUrlConfig.ts'),
            handler: 'handler',
            runtime: aws_cdk_lib_1.aws_lambda.Runtime.NODEJS_18_X,
            environment: {
                CONFIG_BUCKET_NAME: configBucket.bucketName,
            },
        });
        // Logs Lambda
        const logsFn = new aws_cdk_lib_1.aws_lambda_nodejs.NodejsFunction(this, 'LogsFunction', {
            entry: 'lambda/logs.ts',
            handler: 'handler',
            runtime: aws_cdk_lib_1.aws_lambda.Runtime.NODEJS_18_X,
            timeout: aws_cdk_lib_1.Duration.minutes(3),
            bundling: {
                format: aws_cdk_lib_1.aws_lambda_nodejs.OutputFormat.CJS,
                externalModules: ['aws-sdk'],
            },
            environment: {
                LOG_TABLE_NAME: aiGatewayLogsTable.tableName,
                LOG_BUCKET_NAME: logBucket.bucketName,
                ATHENA_WORKGROUP: athenaWorkgroupName,
            },
        });
        // === NEW: Migrate Logs Lambda ===
        const migrateLogsFn = new aws_cdk_lib_1.aws_lambda_nodejs.NodejsFunction(this, 'MigrateLogsFunction', {
            entry: 'lambda/migrateLogs.ts', // your newly created file
            handler: 'handler',
            runtime: aws_cdk_lib_1.aws_lambda.Runtime.NODEJS_18_X,
            timeout: aws_cdk_lib_1.Duration.minutes(5),
            bundling: {
                format: aws_cdk_lib_1.aws_lambda_nodejs.OutputFormat.CJS,
                externalModules: ['aws-sdk'],
            },
            environment: {
                LOG_TABLE_NAME: aiGatewayLogsTable.tableName,
                LOG_BUCKET_NAME: logBucket.bucketName,
            },
        });
        aiGatewayLogsTable.grantReadWriteData(migrateLogsFn);
        logBucket.grantReadWrite(migrateLogsFn);
        // === Schedule to run every 5 minutes ===
        new aws_events_1.Rule(this, 'MigrateLogsScheduleRule', {
            schedule: aws_events_1.Schedule.rate(aws_cdk_lib_1.Duration.minutes(5)),
            targets: [new aws_events_targets_1.LambdaFunction(migrateLogsFn)],
        });
        // API Gateway with Cloudwatch logs
        const apiGatewayLogRole = new aws_cdk_lib_1.aws_iam.Role(this, 'ApiGatewayCloudWatchRole', {
            assumedBy: new aws_cdk_lib_1.aws_iam.ServicePrincipal('apigateway.amazonaws.com'),
            managedPolicies: [
                aws_cdk_lib_1.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs'),
            ],
        });
        const logGroup = new aws_cdk_lib_1.aws_logs.LogGroup(this, 'GatewayAccessLogs', {
            logGroupName: `/aws/apigateway/${id}/access-logs`,
            retention: aws_cdk_lib_1.aws_logs.RetentionDays.FOUR_MONTHS,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        const api = new aws_cdk_lib_1.aws_apigateway.RestApi(this, 'AiGatewayRestApi', {
            restApiName: 'AI Gateway API',
            description: 'Routes requests to the appropriate LLM service.',
            apiKeySourceType: aws_cdk_lib_1.aws_apigateway.ApiKeySourceType.HEADER,
            deployOptions: {
                stageName: 'dev',
                loggingLevel: aws_cdk_lib_1.aws_apigateway.MethodLoggingLevel.INFO,
                dataTraceEnabled: true,
                metricsEnabled: true,
                accessLogDestination: new aws_cdk_lib_1.aws_apigateway.LogGroupLogDestination(logGroup),
                accessLogFormat: aws_cdk_lib_1.aws_apigateway.AccessLogFormat.jsonWithStandardFields(),
            },
        });
        const cfnAccount = new aws_cdk_lib_1.aws_apigateway.CfnAccount(this, 'ApiGatewayAccount', {
            cloudWatchRoleArn: apiGatewayLogRole.roleArn,
        });
        cfnAccount.node.addDependency(apiGatewayLogRole);
        api.node.addDependency(cfnAccount);
        const gatewayKey = new aws_cdk_lib_1.aws_apigateway.ApiKey(this, 'GatewayKey', {
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
        configBucket.grantReadWrite(presignedUrlLambda);
        logsFn.addToRolePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
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
        }));
        logsFn.addToRolePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
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
        }));
        logsFn.addToRolePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
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
        }));
        // API routes with explicit CORS configuration
        const routerIntegration = new aws_cdk_lib_1.aws_apigateway.LambdaIntegration(routerFn);
        const routeResource = api.root.addResource('route');
        routeResource.addMethod('POST', routerIntegration, {
            apiKeyRequired: true,
        });
        const logsResource = api.root.addResource('logs');
        // Lambda integration for GET with CORS headers
        const logsIntegration = new aws_cdk_lib_1.aws_apigateway.LambdaIntegration(logsFn); // Proxy: true by default
        logsResource.addMethod('GET', logsIntegration, {
            apiKeyRequired: false,
        });
        const presignedUrlConfigResource = api.root.addResource('config');
        const configIntegration = new aws_cdk_lib_1.aws_apigateway.LambdaIntegration(presignedUrlLambda);
        presignedUrlConfigResource.addMethod('GET', configIntegration, {
            apiKeyRequired: false,
        });
        // OPTIONS method for CORS preflight
        const optionsIntegration = new aws_cdk_lib_1.aws_apigateway.MockIntegration({
            integrationResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': "'*'",
                        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'",
                        'method.response.header.Access-Control-Allow-Methods': "'GET,OPTIONS'",
                    },
                },
            ],
            passthroughBehavior: aws_cdk_lib_1.aws_apigateway.PassthroughBehavior.WHEN_NO_MATCH,
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
        // ---- NEW GUARDRAILS SECTION ----
        // Create the guardrails S3 bucket
        const guardrailsBucket = new aws_cdk_lib_1.aws_s3.Bucket(this, 'GuardrailsBucketNew', {
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            publicReadAccess: false,
            blockPublicAccess: aws_cdk_lib_1.aws_s3.BlockPublicAccess.BLOCK_ALL,
        });
        // Deploy your guardrailUtterances.json into that bucket
        new aws_cdk_lib_1.aws_s3_deployment.BucketDeployment(this, 'DeployGuardrailsJsonNew', {
            sources: [aws_cdk_lib_1.aws_s3_deployment.Source.asset(path.join(__dirname, '../lambda/json'))],
            destinationBucket: guardrailsBucket,
            destinationKeyPrefix: '',
        });
        // 1) Create the new Guardrails Lambda
        const guardrailsFn = new aws_cdk_lib_1.aws_lambda_nodejs.NodejsFunction(this, 'GuardrailsFunction', {
            entry: 'lambda/guardrailsAPIHandler.ts', // This file should handle GET/POST/DELETE logic
            handler: 'handler',
            runtime: aws_cdk_lib_1.aws_lambda.Runtime.NODEJS_18_X,
            timeout: aws_cdk_lib_1.Duration.seconds(30),
            bundling: {
                format: aws_cdk_lib_1.aws_lambda_nodejs.OutputFormat.CJS,
                externalModules: ['aws-sdk'],
            },
            environment: {
                GUARDRAILS_BUCKET: guardrailsBucket.bucketName,
                GUARDRAILS_KEY: 'guardrailUtterances.json',
            },
        });
        // Grant read permissions to the guardrails Lambda
        guardrailsBucket.grantRead(guardrailsFn);
        // 2) (Optional) Grant other necessary permissions if needed, e.g.:
        // guardrailsTable.grantReadWriteData(guardrailsFn);
        // 3) Create the /guardrails resource
        const guardrailsResource = api.root.addResource('guardrails');
        // GET /guardrails
        guardrailsResource.addMethod('GET', new aws_cdk_lib_1.aws_apigateway.LambdaIntegration(guardrailsFn));
        // POST /guardrails
        guardrailsResource.addMethod('POST', new aws_cdk_lib_1.aws_apigateway.LambdaIntegration(guardrailsFn));
        // DELETE /guardrails/{id}
        const singleGuardrailResource = guardrailsResource.addResource('{id}');
        singleGuardrailResource.addMethod('DELETE', new aws_cdk_lib_1.aws_apigateway.LambdaIntegration(guardrailsFn));
        // ---- END NEW GUARDRAILS SECTION ----
        // S3 Bucket for Frontend
        const frontendBucket = new aws_cdk_lib_1.aws_s3.Bucket(this, 'FrontendBucket', {
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'index.html',
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            publicReadAccess: true,
            blockPublicAccess: new aws_cdk_lib_1.aws_s3.BlockPublicAccess({
                blockPublicAcls: false,
                ignorePublicAcls: false,
                blockPublicPolicy: false,
                restrictPublicBuckets: false,
            }),
        });
        frontendBucket.addToResourcePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            actions: ['s3:GetObject'],
            resources: [`${frontendBucket.bucketArn}/*`],
            principals: [new aws_cdk_lib_1.aws_iam.AnyPrincipal()],
        }));
        // Define the logs and config endpoints
        const apiEndpoint = `${api.url}`;
        // Inject the endpoints via config.js
        const configJsContent = `
      window.API_ENDPOINT = ${JSON.stringify(apiEndpoint)};
    `;
        // Deploy frontend from /frontend-ui/dist
        new aws_cdk_lib_1.aws_s3_deployment.BucketDeployment(this, 'DeployFrontend', {
            sources: [
                aws_cdk_lib_1.aws_s3_deployment.Source.asset(path.join(__dirname, '..', 'frontend-ui', 'dist') // <-- adapt path if needed
                ),
                aws_cdk_lib_1.aws_s3_deployment.Source.data('config.js', configJsContent),
            ],
            destinationBucket: frontendBucket,
        });
        // NEW: Output the deployed website URL of the S3 frontend bucket
        new aws_cdk_lib_1.CfnOutput(this, 'FrontendBucketUrl', {
            value: frontendBucket.bucketWebsiteUrl,
            description: 'URL for the deployed frontend S3 bucket website',
        });
        // encryptionPolicy.applyRemovalPolicy(RemovalPolicy.DESTROY);
        // accessPolicy.applyRemovalPolicy(RemovalPolicy.DESTROY);
        // vectorCollection.applyRemovalPolicy(RemovalPolicy.DESTROY);
        athenaDatabase.applyRemovalPolicy(aws_cdk_lib_1.RemovalPolicy.DESTROY);
        athenaTable.applyRemovalPolicy(aws_cdk_lib_1.RemovalPolicy.DESTROY);
        // createVectorIndex.applyRemovalPolicy(RemovalPolicy.DESTROY);
        // createGuardrailsIndex.applyRemovalPolicy(RemovalPolicy.DESTROY);
    }
}
exports.AiGatewayStack = AiGatewayStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWktZ2F0ZXdheS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9haS1nYXRld2F5LXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsNkNBc0JxQjtBQUNyQixxQ0FBcUM7QUFDckMsdURBQXdEO0FBQ3hELHVFQUFnRTtBQUVoRSxpRUFBbUQ7QUFJbkQsMkNBQTZCO0FBRTdCLE1BQWEsY0FBZSxTQUFRLG1CQUFLO0lBQ3ZDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDMUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIscUJBQXFCO1FBQ3JCLE1BQU0sU0FBUyxHQUFHLElBQUksb0JBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUNwRCxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO1lBQ3BDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsY0FBYyxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsc0JBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztTQUNwRCxDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsbUJBQW1CLENBQzNCLElBQUkscUJBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsT0FBTyxFQUFFO2dCQUNQLGNBQWM7Z0JBQ2QsY0FBYztnQkFDZCxlQUFlO2dCQUNmLHNCQUFzQjthQUN2QjtZQUNELFVBQVUsRUFBRSxDQUFDLElBQUkscUJBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQzlELFNBQVMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsR0FBRyxTQUFTLENBQUMsU0FBUyxJQUFJLENBQUM7U0FDN0QsQ0FBQyxDQUNILENBQUM7UUFFRixNQUFNLFlBQVksR0FBRyxJQUFJLDBCQUFRLENBQUMsS0FBSyxDQUFDLElB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LFdBQVcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUVqQyxxQ0FBcUM7UUFDckMsTUFBTSxlQUFlLEdBQUc7OEJBQ0UsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUM7S0FDcEQsQ0FBQztRQUVGLHlDQUF5QztRQUN6QyxJQUFJLCtCQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3BELE9BQU8sRUFBRTtnQkFDUCwrQkFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUMsMkJBQTJCO2lCQUM5RTtnQkFDRCwrQkFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLGVBQWUsQ0FBQzthQUNuRDtZQUNELGlCQUFpQixFQUFFLGNBQWM7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsaUVBQWlFO1FBQ2pFLElBQUksdUJBQVMsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDdkMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxnQkFBZ0I7WUFDdEMsV0FBVyxFQUFFLGlEQUFpRDtTQUMvRCxDQUFDLENBQUM7UUFFSCw4REFBOEQ7UUFDOUQsMERBQTBEO1FBQzFELDhEQUE4RDtRQUM5RCxjQUFjLENBQUMsa0JBQWtCLENBQUMsMkJBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN6RCxXQUFXLENBQUMsa0JBQWtCLENBQUMsMkJBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0RCwrREFBK0Q7UUFDL0QsbUVBQW1FO0lBQ3JFLENBQUM7Q0FDRjtBQTl2QkQsd0NBOHZCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHtcbiAgQXdzLFxuICBhd3NfbGFtYmRhIGFzIGxhbWJkYSxcbiAgYXdzX2xhbWJkYV9ub2RlanMgYXMgbGFtYmRhTm9kZSxcbiAgYXdzX2FwaWdhdGV3YXkgYXMgYXBpZ2F0ZXdheSxcbiAgYXdzX3NlY3JldHNtYW5hZ2VyIGFzIHNlY3JldHNtYW5hZ2VyLFxuICBhd3NfZHluYW1vZGIgYXMgZHluYW1vZGIsXG4gIGF3c19pYW0gYXMgaWFtLFxuICBhd3NfbG9ncyBhcyBsb2dzLFxuICBhd3NfczMgYXMgczMsXG4gIGF3c19hdGhlbmEgYXMgYXRoZW5hLFxuICBhd3Nfb3BlbnNlYXJjaHNlcnZlcmxlc3MgYXMgb3BlbnNlYXJjaCxcbiAgQ2ZuT3V0cHV0LFxuICBhd3NfczNfZGVwbG95bWVudCBhcyBzM2RlcGxveSxcbiAgQ2ZuUmVzb3VyY2UsXG4gIFN0YWNrLFxuICBTdGFja1Byb3BzLFxuICBEdXJhdGlvbixcbiAgUmVtb3ZhbFBvbGljeSxcbiAgU2VjcmV0VmFsdWUsXG4gIFJlc291cmNlLFxuICBDdXN0b21SZXNvdXJjZSxcbn0gZnJvbSAnYXdzLWNkay1saWInO1xuLy8g4pyFIEFkZCB0aGVzZSBpbXBvcnRzIGZvciBzY2hlZHVsaW5nXG5pbXBvcnQgeyBSdWxlLCBTY2hlZHVsZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMnO1xuaW1wb3J0IHsgTGFtYmRhRnVuY3Rpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzLXRhcmdldHMnO1xuXG5pbXBvcnQgKiBhcyBjciBmcm9tICdhd3MtY2RrLWxpYi9jdXN0b20tcmVzb3VyY2VzJztcbmltcG9ydCB7IHRpbWVTdGFtcCB9IGZyb20gJ2NvbnNvbGUnO1xuaW1wb3J0IHsgUmVzb3VyY2VUeXBlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvbmZpZyc7XG5pbXBvcnQgeyBQZXJtaXNzaW9uIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXMzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBjbGFzcyBBaUdhdGV3YXlTdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBTMyBidWNrZXQgZm9yIGxvZ3NcbiAgICBjb25zdCBsb2dCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdMTE1Mb2dCdWNrZXQnLCB7XG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbeyBleHBpcmF0aW9uOiBEdXJhdGlvbi5kYXlzKDkwKSB9XSxcbiAgICB9KTtcblxuICAgIGxvZ0J1Y2tldC5hZGRUb1Jlc291cmNlUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ3MzOlB1dE9iamVjdCcsXG4gICAgICAgICAgJ3MzOkdldE9iamVjdCcsXG4gICAgICAgICAgJ3MzOkxpc3RCdWNrZXQnLFxuICAgICAgICAgICdzMzpHZXRCdWNrZXRMb2NhdGlvbicsXG4gICAgICAgIF0sXG4gICAgICAgIHByaW5jaXBhbHM6IFtuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2F0aGVuYS5hbWF6b25hd3MuY29tJyldLFxuICAgICAgICByZXNvdXJjZXM6IFtsb2dCdWNrZXQuYnVja2V0QXJuLCBgJHtsb2dCdWNrZXQuYnVja2V0QXJufS8qYF0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICBjb25zdCBtZXNzYWdlVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0xMTU1lc3NhZ2VUYWJsZScsIHtcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndGhyZWFkSUQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBEeW5hbW9EQiB0YWJsZVxuICAgIGNvbnN0IGFpR2F0ZXdheUxvZ3NUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnQWlHYXRld2F5TG9nc1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiAnYWktZ2F0ZXdheS1sb2dzLXRhYmxlJyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnUEsnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnU0snLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIFNpbXBsZSBjYWNoaW5nIER5bmFtb0RCIHRhYmxlXG4gICAgY29uc3QgYWlHYXRld2F5Q2FjaGVUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZShcbiAgICAgIHRoaXMsXG4gICAgICAnQWlHYXRld2F5Q2FjaGVUYWJsZScsXG4gICAgICB7XG4gICAgICAgIHRhYmxlTmFtZTogJ2FpLWdhdGV3YXktY2FjaGUtdGFibGUnLFxuICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2NhY2hlS2V5JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgICB0aW1lVG9MaXZlQXR0cmlidXRlOiAndHRsJywgLy8gQXV0b21hdGljYWxseSByZW1vdmUgZXhwaXJlZCBpdGVtc1xuICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBTRU1BTlRJQyBDQUNIRSAvIEdVQVJEUkFJTFMgSVRFTVMgU1RBUlRcbiAgICAvLyBTZWN1cml0eSBwb2xpY3kgZm9yIE9wZW5TZWFyY2ggU2VydmVybGVzcyBjb2xsZWN0aW9uIGZvciBzZW1hbnRpYyBjYWNoZVxuICAgIC8vIGNvbnN0IGVuY3J5cHRpb25Qb2xpY3kgPSBuZXcgb3BlbnNlYXJjaC5DZm5TZWN1cml0eVBvbGljeSh0aGlzLCAnT3BlblNlYXJjaEVuY3J5cHRpb25Qb2xpY3knLCB7XG4gICAgLy8gICBuYW1lOiAnc2VtYW50aWMtY2FjaGUtZW5jcnlwdGlvbi1wb2xpY3knLFxuICAgIC8vICAgdHlwZTogJ2VuY3J5cHRpb24nLFxuICAgIC8vICAgcG9saWN5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgLy8gICAgIFJ1bGVzOiBbXG4gICAgLy8gICAgICAge1xuICAgIC8vICAgICAgICAgUmVzb3VyY2VUeXBlOiAnY29sbGVjdGlvbicsXG4gICAgLy8gICAgICAgICBSZXNvdXJjZTogWydjb2xsZWN0aW9uL3NlbWFudGljLWNhY2hlJ11cbiAgICAvLyAgICAgICB9XG4gICAgLy8gICAgIF0sXG4gICAgLy8gICAgIEFXU093bmVkS2V5OiB0cnVlXG4gICAgLy8gICB9KVxuICAgIC8vIH0pO1xuXG4gICAgLy8gY29uc3QgZ3VhcmRyYWlsc0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0d1YXJkcmFpbHNCdWNrZXQnLCB7XG4gICAgLy8gICBidWNrZXROYW1lOiAnYWktZ3VhcmRyYWlscy1idWNrZXQnLFxuICAgIC8vICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIC8vICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXG4gICAgLy8gICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcbiAgICAvLyAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgLy8gfSk7XG5cbiAgICAvLyBuZXcgczNkZXBsb3kuQnVja2V0RGVwbG95bWVudCh0aGlzLCAnRGVwbG95R3VhcmRyYWlsc0pzb24nLCB7XG4gICAgLy8gICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9sYW1iZGEvanNvbicpKV0sXG4gICAgLy8gICBkZXN0aW5hdGlvbkJ1Y2tldDogZ3VhcmRyYWlsc0J1Y2tldCxcbiAgICAvLyAgIGRlc3RpbmF0aW9uS2V5UHJlZml4OiAnJyxcbiAgICAvLyB9KTtcblxuICAgIC8vIC8vIGFsbG93IHB1YmxpYyBuZXR3b3JrIGFjY2VzcyB0byBPcGVuU2VhcmNoIC0gdGlnaHRlbiB0aGlzIGRvd24/XG4gICAgLy8gY29uc3QgYWNjZXNzUG9saWN5ID0gbmV3IG9wZW5zZWFyY2guQ2ZuU2VjdXJpdHlQb2xpY3kodGhpcywgJ1B1YmxpY05ldHdvcmtQb2xpY3knLCB7XG4gICAgLy8gICBuYW1lOiAncHVibGljLW5ldHdvcmstcG9saWN5JyxcbiAgICAvLyAgIHR5cGU6ICduZXR3b3JrJyxcbiAgICAvLyAgIHBvbGljeTogSlNPTi5zdHJpbmdpZnkoW1xuICAgIC8vICAgICB7XG4gICAgLy8gICAgICAgUnVsZXM6IFtcbiAgICAvLyAgICAgICAgIHtcbiAgICAvLyAgICAgICAgICAgUmVzb3VyY2VUeXBlOiAnY29sbGVjdGlvbicsXG4gICAgLy8gICAgICAgICAgIFJlc291cmNlOiBbJ2NvbGxlY3Rpb24vc2VtYW50aWMtY2FjaGUnXSxcbiAgICAvLyAgICAgICAgIH0sXG4gICAgLy8gICAgICAgXSxcbiAgICAvLyAgICAgICBBbGxvd0Zyb21QdWJsaWM6IHRydWUsXG4gICAgLy8gICAgIH0sXG4gICAgLy8gICBdKSxcbiAgICAvLyB9KTtcblxuICAgIC8vIC8vIE9wZW5TZWFyY2ggU2VydmVybGVzcyBjb2xsZWN0aW9uIGZvciBzZW1hbnRpYyBjYWNoZVxuICAgIC8vIGNvbnN0IHZlY3RvckNvbGxlY3Rpb24gPSBuZXcgb3BlbnNlYXJjaC5DZm5Db2xsZWN0aW9uKHRoaXMsICdTZW1hbnRpY0NhY2hlQ29sbGVjdGlvbicsIHtcbiAgICAvLyAgIG5hbWU6ICdzZW1hbnRpYy1jYWNoZScsXG4gICAgLy8gICB0eXBlOiAnVkVDVE9SU0VBUkNIJyxcbiAgICAvLyAgIC8vIFwiZGV2LXRlc3QgbW9kZVwiIC0gZGlzYWJsaW5nIHJlcGxpY2FzIHNob3VsZCBjdXQgY29zdCBpbiBoYWxmXG4gICAgLy8gICBzdGFuZGJ5UmVwbGljYXM6ICdESVNBQkxFRCcsXG4gICAgLy8gfSk7XG5cbiAgICAvLyB2ZWN0b3JDb2xsZWN0aW9uLm5vZGUuYWRkRGVwZW5kZW5jeShlbmNyeXB0aW9uUG9saWN5KTtcbiAgICAvLyB2ZWN0b3JDb2xsZWN0aW9uLm5vZGUuYWRkRGVwZW5kZW5jeShhY2Nlc3NQb2xpY3kpO1xuXG4gICAgLy8gLy8gSUFNIHJvbGUgZm9yIExhbWJkYSB0byBpbnZva2UgQmVkcm9jayBtb2RlbHMgYW5kIGFjY2VzcyBPcGVuU2VhcmNoIEFQSVxuICAgIC8vIGNvbnN0IHNlbWFudGljQ2FjaGVMYW1iZGFSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdTZW1hbnRpY0NhY2hlTGFtYmRhUm9sZScsIHtcbiAgICAvLyAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxuICAgIC8vICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgLy8gICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpXG4gICAgLy8gICBdXG4gICAgLy8gfSk7XG5cbiAgICAvLyBuZXcgb3BlbnNlYXJjaC5DZm5BY2Nlc3NQb2xpY3kodGhpcywgJ09wZW5TZWFyY2hBY2Nlc3NQb2xpY3knLCB7XG4gICAgLy8gICBuYW1lOiAnc2VtYW50aWMtY2FjaGUtYWNjZXNzLXBvbGljeScsXG4gICAgLy8gICB0eXBlOiAnZGF0YScsXG4gICAgLy8gICBwb2xpY3k6IEpTT04uc3RyaW5naWZ5KFtcbiAgICAvLyAgICAge1xuICAgIC8vICAgICAgIFJ1bGVzOiBbXG4gICAgLy8gICAgICAgICB7XG4gICAgLy8gICAgICAgICAgIFJlc291cmNlVHlwZTogXCJjb2xsZWN0aW9uXCIsXG4gICAgLy8gICAgICAgICAgIFJlc291cmNlOiBbYGNvbGxlY3Rpb24vJHt2ZWN0b3JDb2xsZWN0aW9uLm5hbWV9YF0sXG4gICAgLy8gICAgICAgICAgIFBlcm1pc3Npb246IFtcImFvc3M6KlwiXSxcbiAgICAvLyAgICAgICAgIH0sXG4gICAgLy8gICAgICAgICB7XG4gICAgLy8gICAgICAgICAgIFJlc291cmNlVHlwZTogXCJpbmRleFwiLFxuICAgIC8vICAgICAgICAgICBSZXNvdXJjZTogW1wiaW5kZXgvKi8qXCJdLFxuICAgIC8vICAgICAgICAgICBQZXJtaXNzaW9uOiBbXCJhb3NzOipcIl1cbiAgICAvLyAgICAgICAgIH1cbiAgICAvLyAgICAgICBdLFxuICAgIC8vICAgICAgIFByaW5jaXBhbDogW1xuICAgIC8vICAgICAgICAgc2VtYW50aWNDYWNoZUxhbWJkYVJvbGUucm9sZUFybixcbiAgICAvLyAgICAgICAgIGBhcm46YXdzOmlhbTo6JHtBd3MuQUNDT1VOVF9JRH06cm9vdGAsXG4gICAgLy8gICAgICAgXVxuICAgIC8vICAgICB9XG4gICAgLy8gICBdKVxuICAgIC8vIH0pO1xuXG4gICAgLy8gc2VtYW50aWNDYWNoZUxhbWJkYVJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgIC8vICAgYWN0aW9uczogWydiZWRyb2NrOkludm9rZU1vZGVsJ10sXG4gICAgLy8gICAvLyBUT0RPOiBsaW1pdCB0aGlzIHRvIGEgc3BlY2lmaWMgQmVkcm9jayBtb2RlbChzKT9cbiAgICAvLyAgIHJlc291cmNlczogWycqJ11cbiAgICAvLyB9KSk7XG5cbiAgICAvLyBzZW1hbnRpY0NhY2hlTGFtYmRhUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgLy8gICBhY3Rpb25zOiBbXG4gICAgLy8gICAgICdhb3NzOlJlYWREb2N1bWVudCcsXG4gICAgLy8gICAgICdhb3NzOldyaXRlRG9jdW1lbnQnLFxuICAgIC8vICAgICAnYW9zczpEZXNjcmliZUNvbGxlY3Rpb25JdGVtcycsXG4gICAgLy8gICAgICdhb3NzOkRlc2NyaWJlQ29sbGVjdGlvbicsXG4gICAgLy8gICAgICdhb3NzOkxpc3RDb2xsZWN0aW9ucycsXG4gICAgLy8gICAgICdhb3NzOkRlc2NyaWJlSW5kZXgnLFxuICAgIC8vICAgICAnYW9zczpMaXN0SW5kZXhlcycsXG4gICAgLy8gICAgICdhb3NzOkFQSUFjY2Vzc0FsbCcsXG4gICAgLy8gICAgICdzMzpHZXRPYmplY3QnLFxuICAgIC8vICAgICAnczM6TGlzdEJ1Y2tldCcsXG4gICAgLy8gICBdLFxuICAgIC8vICAgLy8gVE9ETzogbGltaXQgdGhpcyBtb3JlIHRvIHNwZWNpZmljIHJlc291cmNlcz9cbiAgICAvLyAgIHJlc291cmNlczogW1xuICAgIC8vICAgICBgYXJuOmF3czphb3NzOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fToqYCxcbiAgICAvLyAgICAgYGFybjphd3M6YW9zczoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06Y29sbGVjdGlvbi9zZW1hbnRpYy1jYWNoZWAsXG4gICAgLy8gICAgIGBhcm46YXdzOmFvc3M6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OmluZGV4L3NlbWFudGljLWNhY2hlLypgLFxuICAgIC8vICAgICBgYXJuOmF3czphb3NzOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTppbmRleC9ndWFyZHJhaWxzLWluZGV4LypgLCAvLyBhZGRlZCBmb3IgZ3VhcmRyYWlsc1xuICAgIC8vICAgICAnYXJuOmF3czpzMzo6OmFpLWd1YXJkcmFpbHMtYnVja2V0JyxcbiAgICAvLyAgICAgJ2Fybjphd3M6czM6OjphaS1ndWFyZHJhaWxzLWJ1Y2tldC9ndWFyZHJhaWxVdHRlcmFuY2VzLmpzb24nXG4gICAgLy8gICBdXG4gICAgLy8gfSkpO1xuXG4gICAgLy8gbmV3IENmbk91dHB1dCh0aGlzLCAnT3BlblNlYXJjaEVuZHBvaW50Jywge1xuICAgIC8vICAgdmFsdWU6IGAke3ZlY3RvckNvbGxlY3Rpb24uYXR0ckNvbGxlY3Rpb25FbmRwb2ludH1gLFxuICAgIC8vICAgZXhwb3J0TmFtZTogJ09wZW5TZWFyY2hDb2xsZWN0aW9uRW5kcG9pbnQnLFxuICAgIC8vIH0pO1xuXG4gICAgLy8gbmV3IENmbk91dHB1dCh0aGlzLCAnT3BlblNlYXJjaENvbGxlY3Rpb25BdHRySWQnLCB7XG4gICAgLy8gICB2YWx1ZTogYCR7dmVjdG9yQ29sbGVjdGlvbi5hdHRySWR9YCxcbiAgICAvLyAgIGV4cG9ydE5hbWU6ICdPcGVuU2VhcmNoQ29sbGVjdGlvbkF0dHJJZCcsXG4gICAgLy8gfSk7XG5cbiAgICAvLyBjb25zdCBjcmVhdGVWZWN0b3JJbmRleEZuID0gbmV3IGxhbWJkYU5vZGUuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0NyZWF0ZVZlY3RvckluZGV4RnVuY3Rpb24nLCB7XG4gICAgLy8gICBlbnRyeTogJ2xhbWJkYS92ZWN0b3JJbmRleC50cycsXG4gICAgLy8gICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgLy8gICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAvLyAgIHRpbWVvdXQ6IER1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgLy8gICByb2xlOiBzZW1hbnRpY0NhY2hlTGFtYmRhUm9sZSxcbiAgICAvLyAgIGJ1bmRsaW5nOiB7XG4gICAgLy8gICAgIGZvcm1hdDogbGFtYmRhTm9kZS5PdXRwdXRGb3JtYXQuQ0pTLFxuICAgIC8vICAgICBleHRlcm5hbE1vZHVsZXM6IFsnYXdzLXNkayddLFxuICAgIC8vICAgfSxcbiAgICAvLyAgIGVudmlyb25tZW50OiB7XG4gICAgLy8gICAgIE9QRU5TRUFSQ0hfRU5EUE9JTlQ6IHZlY3RvckNvbGxlY3Rpb24uYXR0ckNvbGxlY3Rpb25FbmRwb2ludCxcbiAgICAvLyAgICAgT1BFTlNFQVJDSF9JTkRFWDogJ3NlbWFudGljLWNhY2hlLWluZGV4JyxcbiAgICAvLyAgICAgR1VBUkRSQUlMX1VUVEVSQU5DRVNfUzNfVVJJOiAnczM6Ly9haS1ndWFyZHJhaWxzLWJ1Y2tldC9ndWFyZHJhaWxVdHRlcmFuY2VzLmpzb24nXG4gICAgLy8gICB9LFxuICAgIC8vIH0pO1xuXG4gICAgLy8gY29uc3QgcHJvdmlkZXIgPSBuZXcgY3IuUHJvdmlkZXIodGhpcywgJ0NyZWF0ZVZlY3RvckluZGV4UHJvdmlkZXInLCB7XG4gICAgLy8gICBvbkV2ZW50SGFuZGxlcjogY3JlYXRlVmVjdG9ySW5kZXhGbixcbiAgICAvLyAgIGxvZ0dyb3VwOiBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnQ1JQcm92aWRlckxvZ3MnLCB7XG4gICAgLy8gICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLkZJVkVfREFZU1xuICAgIC8vICAgfSksXG4gICAgLy8gfSk7XG5cbiAgICAvLyBjb25zdCBjcmVhdGVWZWN0b3JJbmRleCA9IG5ldyBDdXN0b21SZXNvdXJjZSh0aGlzLCAnQ3JlYXRlVmVjdG9ySW5kZXgnLCB7XG4gICAgLy8gICBzZXJ2aWNlVG9rZW46IHByb3ZpZGVyLnNlcnZpY2VUb2tlbixcbiAgICAvLyAgIHNlcnZpY2VUaW1lb3V0OiBEdXJhdGlvbi5zZWNvbmRzKDkwMCksIC8vIDE1IG1pblxuICAgIC8vICAgLy8gc2hvdWxkIGludm9rZSBMYW1iZGEgYWdhaW4gaWYgZWl0aGVyIG9mIHRoZXNlIHByb3BlcnRpZXMgY2hhbmdlXG4gICAgLy8gICBwcm9wZXJ0aWVzOiB7XG4gICAgLy8gICAgIGNvbGxlY3Rpb25OYW1lOiB2ZWN0b3JDb2xsZWN0aW9uLm5hbWUsXG4gICAgLy8gICAgIGluZGV4TmFtZTogJ3NlbWFudGljLWNhY2hlLWluZGV4JyxcbiAgICAvLyAgICAgZGltZW5zaW9uOiAxMDI0LFxuICAgIC8vICAgfSxcbiAgICAvLyB9KTtcblxuICAgIC8vIC8vIGN1c3RvbSByZXNvdXJjZSBmb3IgZ3VhcmRyYWlscyBpbmRleFxuICAgIC8vIGNvbnN0IGNyZWF0ZUd1YXJkcmFpbHNJbmRleCA9IG5ldyBDdXN0b21SZXNvdXJjZSh0aGlzLCAnQ3JlYXRlR3VhcmRyYWlsc0luZGV4Jywge1xuICAgIC8vICAgc2VydmljZVRva2VuOiBwcm92aWRlci5zZXJ2aWNlVG9rZW4sXG4gICAgLy8gICBzZXJ2aWNlVGltZW91dDogRHVyYXRpb24uc2Vjb25kcyg5MDApLCAvLyAxNSBtaW5cbiAgICAvLyAgIC8vIHNob3VsZCBpbnZva2UgTGFtYmRhIGFnYWluIGlmIGVpdGhlciBvZiB0aGVzZSBwcm9wZXJ0aWVzIGNoYW5nZVxuICAgIC8vICAgcHJvcGVydGllczoge1xuICAgIC8vICAgICBjb2xsZWN0aW9uTmFtZTogdmVjdG9yQ29sbGVjdGlvbi5uYW1lLFxuICAgIC8vICAgICBpbmRleE5hbWU6ICdndWFyZHJhaWxzLWluZGV4JyxcbiAgICAvLyAgICAgZGltZW5zaW9uOiAxMDI0LFxuICAgIC8vICAgICBtYXBwaW5nczogSlNPTi5zdHJpbmdpZnkoe1xuICAgIC8vICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAvLyAgICAgICAgIGVtYmVkZGluZzoge1xuICAgIC8vICAgICAgICAgICB0eXBlOiBcImtubl92ZWN0b3JcIixcbiAgICAvLyAgICAgICAgICAgZGltZW5zaW9uOiAxMDI0LFxuICAgIC8vICAgICAgICAgICBtZXRob2Q6IHtcbiAgICAvLyAgICAgICAgICAgICBlbmdpbmU6IFwibm1zbGliXCIsIC8vIG5vbi1tZXRyaWMgc3BhY2UgbGlicmFyeSAoYXBwcm94LiBubiBzZWFyY2ggbGlicmFyeSlcbiAgICAvLyAgICAgICAgICAgICBzcGFjZV90eXBlOiBcImNvc2luZXNpbWlsXCIsXG4gICAgLy8gICAgICAgICAgICAgbmFtZTogXCJobnN3XCIsIC8vIGhlaXJhcmNoaWNhbCBuYXZpZ2FibGUgc21hbGwgd29ybGQgKGdyYXBoLWJhc2VkIGFubiBhbGdvcml0aG0pXG4gICAgLy8gICAgICAgICAgICAgcGFyYW1ldGVyczoge31cbiAgICAvLyAgICAgICAgICAgfVxuICAgIC8vICAgICAgICAgfSxcbiAgICAvLyAgICAgICAgIHRleHQ6IHsgdHlwZTogXCJ0ZXh0XCIgfSwgLy8gVE9ETyBpbmNsdWRlIGNhdGVnb3J5IGhlcmU/XG4gICAgLy8gICAgICAgfVxuICAgIC8vICAgICB9KSxcbiAgICAvLyAgICAgZ3VhcmRyYWlsc0J1Y2tldDogZ3VhcmRyYWlsc0J1Y2tldC5idWNrZXROYW1lLFxuICAgIC8vICAgICBndWFyZHJhaWxzS2V5OiAnZ3VhcmRyYWlsVXR0ZXJhbmNlcy5qc29uJ1xuICAgIC8vICAgfSxcbiAgICAvLyB9KTtcblxuICAgIC8vIGNyZWF0ZVZlY3RvckluZGV4Lm5vZGUuYWRkRGVwZW5kZW5jeSh2ZWN0b3JDb2xsZWN0aW9uKTtcbiAgICAvLyBjcmVhdGVHdWFyZHJhaWxzSW5kZXgubm9kZS5hZGREZXBlbmRlbmN5KHZlY3RvckNvbGxlY3Rpb24pO1xuICAgIC8vIGd1YXJkcmFpbHNCdWNrZXQuZ3JhbnRSZWFkKHNlbWFudGljQ2FjaGVMYW1iZGFSb2xlKTtcbiAgICAvLyBTRU1BTlRJQyBDQUNIRSAvIEdVQVJEUkFJTFMgSVRFTVMgRU5EXG5cbiAgICAvLyBzMyBCdWNrZXQgZm9yIGNvbmZpZyBmaWxlXG4gICAgY29uc3QgY29uZmlnQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnQ29uZmlnQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogJ2dhdGV3YXktY29uZmlnLWJ1Y2tldCcsXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgIGNvcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSwgLy8gb3Igc2V0IHRvIHlvdXIgZnJvbnRlbmQgVVJMXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtzMy5IdHRwTWV0aG9kcy5HRVQsIHMzLkh0dHBNZXRob2RzLlBVVF0sXG4gICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLFxuICAgICAgICAgIGV4cG9zZWRIZWFkZXJzOiBbJ0VUYWcnXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICBuZXcgczNkZXBsb3kuQnVja2V0RGVwbG95bWVudCh0aGlzLCAnRGVwbG95RGVmYXVsdENvbmZpZycsIHtcbiAgICAgIHNvdXJjZXM6IFtzM2RlcGxveS5Tb3VyY2UuYXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYS91dGlsL2RlZmF1bHRDb25maWcnKSldLFxuICAgICAgZGVzdGluYXRpb25CdWNrZXQ6IGNvbmZpZ0J1Y2tldCxcbiAgICAgIGRlc3RpbmF0aW9uS2V5UHJlZml4OiAnY29uZmlncy8nLFxuICAgIH0pO1xuXG4gICAgLy8gU2VjcmV0cyBNYW5hZ2VyIGZvciBBUEkgS2V5c1xuICAgIGNvbnN0IGxsbUFwaUtleXMgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdMTE1Qcm92aWRlcktleXMnLCB7XG4gICAgICBzZWNyZXROYW1lOiAnbGxtLXByb3ZpZGVyLWFwaS1rZXlzJyxcbiAgICAgIHNlY3JldE9iamVjdFZhbHVlOiB7XG4gICAgICAgIEFOVEhST1BJQ19BUElfS0VZOiBTZWNyZXRWYWx1ZS51bnNhZmVQbGFpblRleHQoJ3lvdXItYXBpLWtleScpLFxuICAgICAgICBHRU1JTklfQVBJX0tFWTogU2VjcmV0VmFsdWUudW5zYWZlUGxhaW5UZXh0KCd5b3VyLWFwaS1rZXknKSxcbiAgICAgICAgT1BFTkFJX0FQSV9LRVk6IFNlY3JldFZhbHVlLnVuc2FmZVBsYWluVGV4dCgneW91ci1hcGkta2V5JyksXG4gICAgICB9LFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gQXRoZW5hIHdvcmtncm91cFxuICAgIGNvbnN0IGF0aGVuYVdvcmtncm91cE5hbWUgPSBgJHt0aGlzLnN0YWNrTmFtZX0tbGxtX2xvZ3Nfd29ya2dyb3VwYDtcbiAgICBjb25zdCBhdGhlbmFXb3JrZ3JvdXAgPSBuZXcgYXRoZW5hLkNmbldvcmtHcm91cCh0aGlzLCAnQXRoZW5hV29ya2dyb3VwJywge1xuICAgICAgbmFtZTogYXRoZW5hV29ya2dyb3VwTmFtZSxcbiAgICAgIHN0YXRlOiAnRU5BQkxFRCcsXG4gICAgICB3b3JrR3JvdXBDb25maWd1cmF0aW9uOiB7XG4gICAgICAgIHJlc3VsdENvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICBvdXRwdXRMb2NhdGlvbjogYHMzOi8vJHtsb2dCdWNrZXQuYnVja2V0TmFtZX0vYXRoZW5hLXJlc3VsdHMvYCxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgYXRoZW5hV29ya2dyb3VwLmFwcGx5UmVtb3ZhbFBvbGljeShSZW1vdmFsUG9saWN5LkRFU1RST1kpO1xuXG4gICAgY29uc3QgYXRoZW5hQ2xlYW51cCA9IG5ldyBjci5Bd3NDdXN0b21SZXNvdXJjZShcbiAgICAgIHRoaXMsXG4gICAgICAnQXRoZW5hV29ya2dyb3VwQ2xlYW51cCcsXG4gICAgICB7XG4gICAgICAgIG9uRGVsZXRlOiB7XG4gICAgICAgICAgc2VydmljZTogJ0F0aGVuYScsXG4gICAgICAgICAgYWN0aW9uOiAnZGVsZXRlV29ya0dyb3VwJyxcbiAgICAgICAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICBXb3JrR3JvdXA6IGF0aGVuYVdvcmtncm91cE5hbWUsXG4gICAgICAgICAgICBSZWN1cnNpdmVEZWxldGVPcHRpb246IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBwaHlzaWNhbFJlc291cmNlSWQ6IGNyLlBoeXNpY2FsUmVzb3VyY2VJZC5vZihhdGhlbmFXb3JrZ3JvdXBOYW1lKSxcbiAgICAgICAgfSxcbiAgICAgICAgcG9saWN5OiBjci5Bd3NDdXN0b21SZXNvdXJjZVBvbGljeS5mcm9tU2RrQ2FsbHMoe1xuICAgICAgICAgIHJlc291cmNlczogY3IuQXdzQ3VzdG9tUmVzb3VyY2VQb2xpY3kuQU5ZX1JFU09VUkNFLFxuICAgICAgICB9KSxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgfVxuICAgICk7XG4gICAgbG9nQnVja2V0Lm5vZGUuYWRkRGVwZW5kZW5jeShhdGhlbmFDbGVhbnVwKTtcblxuICAgIC8vIEdsdWUgRGF0YWJhc2UgYW5kIFRhYmxlXG4gICAgY29uc3QgYXRoZW5hRGF0YWJhc2UgPSBuZXcgQ2ZuUmVzb3VyY2UodGhpcywgJ0F0aGVuYURhdGFiYXNlJywge1xuICAgICAgdHlwZTogJ0FXUzo6R2x1ZTo6RGF0YWJhc2UnLFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBDYXRhbG9nSWQ6IHRoaXMuYWNjb3VudCxcbiAgICAgICAgRGF0YWJhc2VJbnB1dDoge1xuICAgICAgICAgIE5hbWU6ICdhaV9nYXRld2F5X2xvZ3NfZGInLFxuICAgICAgICAgIERlc2NyaXB0aW9uOiAnRGF0YWJhc2UgZm9yIEFJIEdhdGV3YXkgbG9ncycsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgYXRoZW5hVGFibGUgPSBuZXcgQ2ZuUmVzb3VyY2UodGhpcywgJ0FJR2F0ZXdheUxvZ3NUYWJsZScsIHtcbiAgICAgIHR5cGU6ICdBV1M6OkdsdWU6OlRhYmxlJyxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgQ2F0YWxvZ0lkOiB0aGlzLmFjY291bnQsXG4gICAgICAgIERhdGFiYXNlTmFtZTogJ2FpX2dhdGV3YXlfbG9nc19kYicsXG4gICAgICAgIFRhYmxlSW5wdXQ6IHtcbiAgICAgICAgICBOYW1lOiAnYWlfZ2F0ZXdheV9sb2dzJyxcbiAgICAgICAgICBUYWJsZVR5cGU6ICdFWFRFUk5BTF9UQUJMRScsXG4gICAgICAgICAgUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgY2xhc3NpZmljYXRpb246ICdwYXJxdWV0JyxcbiAgICAgICAgICAgICdwcm9qZWN0aW9uLmVuYWJsZWQnOiAndHJ1ZScsXG4gICAgICAgICAgICAncHJvamVjdGlvbi5pc19zdWNjZXNzZnVsLnR5cGUnOiAnZW51bScsXG4gICAgICAgICAgICAncHJvamVjdGlvbi5pc19zdWNjZXNzZnVsLnZhbHVlcyc6ICd0cnVlLGZhbHNlJyxcbiAgICAgICAgICAgICdwcm9qZWN0aW9uLmRhdGUudHlwZSc6ICdkYXRlJyxcbiAgICAgICAgICAgICdwcm9qZWN0aW9uLmRhdGUucmFuZ2UnOiAnMjAyNS0wMS0wMSxOT1cnLFxuICAgICAgICAgICAgJ3Byb2plY3Rpb24uZGF0ZS5mb3JtYXQnOiAneXl5eS1NTS1kZCcsXG4gICAgICAgICAgICAncHJvamVjdGlvbi5kYXRlLmludGVydmFsJzogJzEnLFxuICAgICAgICAgICAgJ3Byb2plY3Rpb24uZGF0ZS5pbnRlcnZhbC51bml0JzogJ0RBWVMnLFxuICAgICAgICAgICAgJ3Byb2plY3Rpb24ucHJvdmlkZXIudHlwZSc6ICdlbnVtJyxcbiAgICAgICAgICAgICdwcm9qZWN0aW9uLnByb3ZpZGVyLnZhbHVlcyc6ICdvcGVuYWksYW50aHJvcGljLGdlbWluaSx1bmtub3duJyxcbiAgICAgICAgICAgICdwcm9qZWN0aW9uLm1vZGVsLnR5cGUnOiAnZW51bScsXG4gICAgICAgICAgICAncHJvamVjdGlvbi5tb2RlbC52YWx1ZXMnOlxuICAgICAgICAgICAgICAnZ3B0LTMuNS10dXJibyxncHQtNCxjbGF1ZGUtMy1vcHVzLTIwMjQwMjI5LGdlbWluaS0xLjUtcHJvLHVua25vd24nLFxuICAgICAgICAgICAgJ3N0b3JhZ2UubG9jYXRpb24udGVtcGxhdGUnOiBgczM6Ly8ke2xvZ0J1Y2tldC5idWNrZXROYW1lfS9sb2dzL3BhcnF1ZXQvaXNfc3VjY2Vzc2Z1bD1cXCR7aXNfc3VjY2Vzc2Z1bH0vZGF0ZT1cXCR7ZGF0ZX0vcHJvdmlkZXI9XFwke3Byb3ZpZGVyfS9tb2RlbD1cXCR7bW9kZWx9L2AsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBTdG9yYWdlRGVzY3JpcHRvcjoge1xuICAgICAgICAgICAgQ29sdW1uczogW1xuICAgICAgICAgICAgICB7IE5hbWU6ICdpZCcsIFR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgIHsgTmFtZTogJ3RpbWVzdGFtcCcsIFR5cGU6ICd0aW1lc3RhbXAnIH0sXG4gICAgICAgICAgICAgIHsgTmFtZTogJ2xhdGVuY3knLCBUeXBlOiAnYmlnaW50JyB9LFxuICAgICAgICAgICAgICB7IE5hbWU6ICdzdWNjZXNzX3JlYXNvbicsIFR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgIHsgTmFtZTogJ2Vycm9yX3JlYXNvbicsIFR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgIHsgTmFtZTogJ21vZGVsX3JvdXRpbmdfaGlzdG9yeScsIFR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgIHsgTmFtZTogJ3VzZXJfaWQnLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICB7IE5hbWU6ICdtZXRhZGF0YScsIFR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgIHsgTmFtZTogJ3RocmVhZF9pZCcsIFR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgIHsgTmFtZTogJ2Nvc3QnLCBUeXBlOiAnZG91YmxlJyB9LFxuICAgICAgICAgICAgICB7IE5hbWU6ICdyYXdfcmVxdWVzdCcsIFR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgIHsgTmFtZTogJ3Jhd19yZXNwb25zZScsIFR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgIHsgTmFtZTogJ2Vycm9yX21lc3NhZ2UnLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIExvY2F0aW9uOiBgczM6Ly8ke2xvZ0J1Y2tldC5idWNrZXROYW1lfS9sb2dzL3BhcnF1ZXQvYCxcbiAgICAgICAgICAgIElucHV0Rm9ybWF0OlxuICAgICAgICAgICAgICAnb3JnLmFwYWNoZS5oYWRvb3AuaGl2ZS5xbC5pby5wYXJxdWV0Lk1hcHJlZFBhcnF1ZXRJbnB1dEZvcm1hdCcsXG4gICAgICAgICAgICBPdXRwdXRGb3JtYXQ6XG4gICAgICAgICAgICAgICdvcmcuYXBhY2hlLmhhZG9vcC5oaXZlLnFsLmlvLnBhcnF1ZXQuTWFwcmVkUGFycXVldE91dHB1dEZvcm1hdCcsXG4gICAgICAgICAgICBTZXJkZUluZm86IHtcbiAgICAgICAgICAgICAgU2VyaWFsaXphdGlvbkxpYnJhcnk6XG4gICAgICAgICAgICAgICAgJ29yZy5hcGFjaGUuaGFkb29wLmhpdmUucWwuaW8ucGFycXVldC5zZXJkZS5QYXJxdWV0SGl2ZVNlckRlJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBQYXJ0aXRpb25LZXlzOiBbXG4gICAgICAgICAgICB7IE5hbWU6ICdpc19zdWNjZXNzZnVsJywgVHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgIHsgTmFtZTogJ2RhdGUnLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgeyBOYW1lOiAncHJvdmlkZXInLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgeyBOYW1lOiAnbW9kZWwnLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgYXRoZW5hVGFibGUuYWRkRGVwZW5kZW5jeShhdGhlbmFEYXRhYmFzZSk7XG4gICAgYXRoZW5hRGF0YWJhc2UuYWRkRGVwZW5kZW5jeShhdGhlbmFXb3JrZ3JvdXApO1xuICAgIGxvZ0J1Y2tldC5ncmFudFJlYWQobmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdhdGhlbmEuYW1hem9uYXdzLmNvbScpKTtcblxuICAgIC8vIFJvdXRlciBMYW1iZGFcbiAgICBjb25zdCByb3V0ZXJGbiA9IG5ldyBsYW1iZGFOb2RlLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdSb3V0ZXJGdW5jdGlvbicsIHtcbiAgICAgIGVudHJ5OiAnbGFtYmRhL3JvdXRlci50cycsXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgZm9ybWF0OiBsYW1iZGFOb2RlLk91dHB1dEZvcm1hdC5DSlMsXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydhd3Mtc2RrJ10sXG4gICAgICAgIG5vZGVNb2R1bGVzOiBbJ0BzbWl0aHkvdXRpbC11dGY4J10sXG4gICAgICB9LFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgTE9HX1RBQkxFX05BTUU6IGFpR2F0ZXdheUxvZ3NUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFNFQ1JFVF9OQU1FOiBsbG1BcGlLZXlzLnNlY3JldE5hbWUsXG4gICAgICAgIE1FU1NBR0VfVEFCTEVfTkFNRTogbWVzc2FnZVRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgU1lTVEVNX1BST01QVDogJ1lvdSBhcmUgYSBoZWxwZnVsIGFzc2lzdGFudC4gWW91IGFuc3dlciBpbiBjb2NrbmV5LicsXG4gICAgICAgIExPR19CVUNLRVRfTkFNRTogbG9nQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICAgIENBQ0hFX1RBQkxFX05BTUU6IGFpR2F0ZXdheUNhY2hlVGFibGUudGFibGVOYW1lLFxuICAgICAgICAvLyBPUEVOU0VBUkNIX0VORFBPSU5UOiB2ZWN0b3JDb2xsZWN0aW9uLmF0dHJDb2xsZWN0aW9uRW5kcG9pbnQsXG4gICAgICAgIE9QRU5TRUFSQ0hfSU5ERVg6ICdzZW1hbnRpYy1jYWNoZS1pbmRleCcsXG4gICAgICAgIE9QRU5TRUFSQ0hfR1VBUkRSQUlMU19JTkRFWDogJ2d1YXJkcmFpbHMtaW5kZXgnLFxuICAgICAgICBDT05GSUdfQlVDS0VUX05BTUU6IGNvbmZpZ0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHJvdXRlckZuLmFkZFRvUm9sZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogWydzY2hlZHVsZXI6Q3JlYXRlU2NoZWR1bGUnLCAnaWFtOlBhc3NSb2xlJ10sXG4gICAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBHZXQgYW5kIFB1dCBDb25maWcgTGFtYmRhXG4gICAgY29uc3QgcHJlc2lnbmVkVXJsTGFtYmRhID0gbmV3IGxhbWJkYU5vZGUuTm9kZWpzRnVuY3Rpb24odGhpcywgJ1ByZXNpZ25lZFVybENvbmZpZ0xhbWJkYScsIHtcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL3ByZXNpZ25lZFVybENvbmZpZy50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBDT05GSUdfQlVDS0VUX05BTUU6IGNvbmZpZ0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIExvZ3MgTGFtYmRhXG4gICAgY29uc3QgbG9nc0ZuID0gbmV3IGxhbWJkYU5vZGUuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0xvZ3NGdW5jdGlvbicsIHtcbiAgICAgIGVudHJ5OiAnbGFtYmRhL2xvZ3MudHMnLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICB0aW1lb3V0OiBEdXJhdGlvbi5taW51dGVzKDMpLFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgZm9ybWF0OiBsYW1iZGFOb2RlLk91dHB1dEZvcm1hdC5DSlMsXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydhd3Mtc2RrJ10sXG4gICAgICB9LFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgTE9HX1RBQkxFX05BTUU6IGFpR2F0ZXdheUxvZ3NUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIExPR19CVUNLRVRfTkFNRTogbG9nQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICAgIEFUSEVOQV9XT1JLR1JPVVA6IGF0aGVuYVdvcmtncm91cE5hbWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gPT09IE5FVzogTWlncmF0ZSBMb2dzIExhbWJkYSA9PT1cbiAgICBjb25zdCBtaWdyYXRlTG9nc0ZuID0gbmV3IGxhbWJkYU5vZGUuTm9kZWpzRnVuY3Rpb24oXG4gICAgICB0aGlzLFxuICAgICAgJ01pZ3JhdGVMb2dzRnVuY3Rpb24nLFxuICAgICAge1xuICAgICAgICBlbnRyeTogJ2xhbWJkYS9taWdyYXRlTG9ncy50cycsIC8vIHlvdXIgbmV3bHkgY3JlYXRlZCBmaWxlXG4gICAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgICAgZm9ybWF0OiBsYW1iZGFOb2RlLk91dHB1dEZvcm1hdC5DSlMsXG4gICAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ2F3cy1zZGsnXSxcbiAgICAgICAgfSxcbiAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICBMT0dfVEFCTEVfTkFNRTogYWlHYXRld2F5TG9nc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgICBMT0dfQlVDS0VUX05BTUU6IGxvZ0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgICk7XG4gICAgYWlHYXRld2F5TG9nc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShtaWdyYXRlTG9nc0ZuKTtcbiAgICBsb2dCdWNrZXQuZ3JhbnRSZWFkV3JpdGUobWlncmF0ZUxvZ3NGbik7XG5cbiAgICAvLyA9PT0gU2NoZWR1bGUgdG8gcnVuIGV2ZXJ5IDUgbWludXRlcyA9PT1cbiAgICBuZXcgUnVsZSh0aGlzLCAnTWlncmF0ZUxvZ3NTY2hlZHVsZVJ1bGUnLCB7XG4gICAgICBzY2hlZHVsZTogU2NoZWR1bGUucmF0ZShEdXJhdGlvbi5taW51dGVzKDUpKSxcbiAgICAgIHRhcmdldHM6IFtuZXcgTGFtYmRhRnVuY3Rpb24obWlncmF0ZUxvZ3NGbildLFxuICAgIH0pO1xuXG4gICAgLy8gQVBJIEdhdGV3YXkgd2l0aCBDbG91ZHdhdGNoIGxvZ3NcbiAgICBjb25zdCBhcGlHYXRld2F5TG9nUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnQXBpR2F0ZXdheUNsb3VkV2F0Y2hSb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2FwaWdhdGV3YXkuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZShcbiAgICAgICAgICAnc2VydmljZS1yb2xlL0FtYXpvbkFQSUdhdGV3YXlQdXNoVG9DbG91ZFdhdGNoTG9ncydcbiAgICAgICAgKSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBsb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdHYXRld2F5QWNjZXNzTG9ncycsIHtcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvYXBpZ2F0ZXdheS8ke2lkfS9hY2Nlc3MtbG9nc2AsXG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5GT1VSX01PTlRIUyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ0FpR2F0ZXdheVJlc3RBcGknLCB7XG4gICAgICByZXN0QXBpTmFtZTogJ0FJIEdhdGV3YXkgQVBJJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUm91dGVzIHJlcXVlc3RzIHRvIHRoZSBhcHByb3ByaWF0ZSBMTE0gc2VydmljZS4nLFxuICAgICAgYXBpS2V5U291cmNlVHlwZTogYXBpZ2F0ZXdheS5BcGlLZXlTb3VyY2VUeXBlLkhFQURFUixcbiAgICAgIGRlcGxveU9wdGlvbnM6IHtcbiAgICAgICAgc3RhZ2VOYW1lOiAnZGV2JyxcbiAgICAgICAgbG9nZ2luZ0xldmVsOiBhcGlnYXRld2F5Lk1ldGhvZExvZ2dpbmdMZXZlbC5JTkZPLFxuICAgICAgICBkYXRhVHJhY2VFbmFibGVkOiB0cnVlLFxuICAgICAgICBtZXRyaWNzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgYWNjZXNzTG9nRGVzdGluYXRpb246IG5ldyBhcGlnYXRld2F5LkxvZ0dyb3VwTG9nRGVzdGluYXRpb24obG9nR3JvdXApLFxuICAgICAgICBhY2Nlc3NMb2dGb3JtYXQ6IGFwaWdhdGV3YXkuQWNjZXNzTG9nRm9ybWF0Lmpzb25XaXRoU3RhbmRhcmRGaWVsZHMoKSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBjZm5BY2NvdW50ID0gbmV3IGFwaWdhdGV3YXkuQ2ZuQWNjb3VudCh0aGlzLCAnQXBpR2F0ZXdheUFjY291bnQnLCB7XG4gICAgICBjbG91ZFdhdGNoUm9sZUFybjogYXBpR2F0ZXdheUxvZ1JvbGUucm9sZUFybixcbiAgICB9KTtcbiAgICBjZm5BY2NvdW50Lm5vZGUuYWRkRGVwZW5kZW5jeShhcGlHYXRld2F5TG9nUm9sZSk7XG4gICAgYXBpLm5vZGUuYWRkRGVwZW5kZW5jeShjZm5BY2NvdW50KTtcblxuICAgIGNvbnN0IGdhdGV3YXlLZXkgPSBuZXcgYXBpZ2F0ZXdheS5BcGlLZXkodGhpcywgJ0dhdGV3YXlLZXknLCB7XG4gICAgICBhcGlLZXlOYW1lOiAnZ2F0ZXdheS1hcGkta2V5JyxcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICBjb25zdCB1c2FnZVBsYW4gPSBhcGkuYWRkVXNhZ2VQbGFuKCdCYXNpY1VzYWdlUGxhbicsIHtcbiAgICAgIG5hbWU6ICdCYXNpY1VzYWdlUGxhbicsXG4gICAgICB0aHJvdHRsZTogeyByYXRlTGltaXQ6IDEwLCBidXJzdExpbWl0OiAyMCB9LFxuICAgIH0pO1xuICAgIHVzYWdlUGxhbi5hZGRBcGlLZXkoZ2F0ZXdheUtleSk7XG4gICAgdXNhZ2VQbGFuLmFkZEFwaVN0YWdlKHsgc3RhZ2U6IGFwaS5kZXBsb3ltZW50U3RhZ2UgfSk7XG5cbiAgICAvLyBQZXJtaXNzaW9uc1xuICAgIGFpR2F0ZXdheUNhY2hlVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHJvdXRlckZuKTtcbiAgICBhaUdhdGV3YXlMb2dzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHJvdXRlckZuKTtcbiAgICBsbG1BcGlLZXlzLmdyYW50UmVhZChyb3V0ZXJGbik7XG4gICAgbG9nQnVja2V0LmdyYW50UmVhZFdyaXRlKHJvdXRlckZuKTtcbiAgICBhaUdhdGV3YXlMb2dzVGFibGUuZ3JhbnRSZWFkRGF0YShsb2dzRm4pO1xuICAgIG1lc3NhZ2VUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEocm91dGVyRm4pO1xuICAgIGxvZ0J1Y2tldC5ncmFudFJlYWRXcml0ZShsb2dzRm4pO1xuICAgIGNvbmZpZ0J1Y2tldC5ncmFudFJlYWQocm91dGVyRm4pO1xuICAgIGNvbmZpZ0J1Y2tldC5ncmFudFJlYWRXcml0ZShwcmVzaWduZWRVcmxMYW1iZGEpO1xuXG4gICAgbG9nc0ZuLmFkZFRvUm9sZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICdhdGhlbmE6U3RhcnRRdWVyeUV4ZWN1dGlvbicsXG4gICAgICAgICAgJ2F0aGVuYTpHZXRRdWVyeUV4ZWN1dGlvbicsXG4gICAgICAgICAgJ2F0aGVuYTpHZXRRdWVyeVJlc3VsdHMnLFxuICAgICAgICAgICdhdGhlbmE6TGlzdFdvcmtHcm91cHMnLFxuICAgICAgICAgICdhdGhlbmE6R2V0V29ya0dyb3VwJyxcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgYGFybjphd3M6YXRoZW5hOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTp3b3JrZ3JvdXAvJHthdGhlbmFXb3JrZ3JvdXBOYW1lfWAsXG4gICAgICAgIF0sXG4gICAgICB9KVxuICAgICk7XG4gICAgbG9nc0ZuLmFkZFRvUm9sZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICdzMzpHZXRPYmplY3QnLFxuICAgICAgICAgICdzMzpQdXRPYmplY3QnLFxuICAgICAgICAgICdzMzpMaXN0QnVja2V0JyxcbiAgICAgICAgICAnczM6R2V0QnVja2V0TG9jYXRpb24nLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBgYXJuOmF3czpzMzo6OiR7bG9nQnVja2V0LmJ1Y2tldE5hbWV9YCxcbiAgICAgICAgICBgYXJuOmF3czpzMzo6OiR7bG9nQnVja2V0LmJ1Y2tldE5hbWV9LypgLFxuICAgICAgICBdLFxuICAgICAgfSlcbiAgICApO1xuICAgIGxvZ3NGbi5hZGRUb1JvbGVQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAnZ2x1ZTpHZXRUYWJsZScsXG4gICAgICAgICAgJ2dsdWU6R2V0VGFibGVzJyxcbiAgICAgICAgICAnZ2x1ZTpHZXREYXRhYmFzZScsXG4gICAgICAgICAgJ2dsdWU6R2V0RGF0YWJhc2VzJyxcbiAgICAgICAgICAnZ2x1ZTpHZXRQYXJ0aXRpb24nLFxuICAgICAgICAgICdnbHVlOkdldFBhcnRpdGlvbnMnLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBgYXJuOmF3czpnbHVlOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTpjYXRhbG9nYCxcbiAgICAgICAgICBgYXJuOmF3czpnbHVlOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTpkYXRhYmFzZS9haV9nYXRld2F5X2xvZ3NfZGJgLFxuICAgICAgICAgIGBhcm46YXdzOmdsdWU6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OnRhYmxlL2FpX2dhdGV3YXlfbG9nc19kYi9haV9nYXRld2F5X2xvZ3NgLFxuICAgICAgICBdLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gQVBJIHJvdXRlcyB3aXRoIGV4cGxpY2l0IENPUlMgY29uZmlndXJhdGlvblxuICAgIGNvbnN0IHJvdXRlckludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocm91dGVyRm4pO1xuICAgIGNvbnN0IHJvdXRlUmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgncm91dGUnKTtcbiAgICByb3V0ZVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIHJvdXRlckludGVncmF0aW9uLCB7XG4gICAgICBhcGlLZXlSZXF1aXJlZDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGxvZ3NSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdsb2dzJyk7XG5cbiAgICAvLyBMYW1iZGEgaW50ZWdyYXRpb24gZm9yIEdFVCB3aXRoIENPUlMgaGVhZGVyc1xuICAgIGNvbnN0IGxvZ3NJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGxvZ3NGbik7IC8vIFByb3h5OiB0cnVlIGJ5IGRlZmF1bHRcbiAgICBsb2dzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBsb2dzSW50ZWdyYXRpb24sIHtcbiAgICAgIGFwaUtleVJlcXVpcmVkOiBmYWxzZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHByZXNpZ25lZFVybENvbmZpZ1Jlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2NvbmZpZycpO1xuICAgIGNvbnN0IGNvbmZpZ0ludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJlc2lnbmVkVXJsTGFtYmRhKTsgXG4gICAgcHJlc2lnbmVkVXJsQ29uZmlnUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBjb25maWdJbnRlZ3JhdGlvbiwge1xuICAgICAgYXBpS2V5UmVxdWlyZWQ6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgLy8gT1BUSU9OUyBtZXRob2QgZm9yIENPUlMgcHJlZmxpZ2h0XG4gICAgY29uc3Qgb3B0aW9uc0ludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTW9ja0ludGVncmF0aW9uKHtcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IFwiJyonXCIsXG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzpcbiAgICAgICAgICAgICAgXCInQ29udGVudC1UeXBlLFgtQW16LURhdGUsQXV0aG9yaXphdGlvbixYLUFwaS1LZXknXCIsXG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzpcbiAgICAgICAgICAgICAgXCInR0VULE9QVElPTlMnXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBwYXNzdGhyb3VnaEJlaGF2aW9yOiBhcGlnYXRld2F5LlBhc3N0aHJvdWdoQmVoYXZpb3IuV0hFTl9OT19NQVRDSCxcbiAgICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHtcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1wic3RhdHVzQ29kZVwiOiAyMDB9JyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBsb2dzUmVzb3VyY2UuYWRkTWV0aG9kKCdPUFRJT05TJywgb3B0aW9uc0ludGVncmF0aW9uLCB7XG4gICAgICBtZXRob2RSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiB0cnVlLFxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyAtLS0tIE5FVyBHVUFSRFJBSUxTIFNFQ1RJT04gLS0tLVxuXG4gICAgLy8gQ3JlYXRlIHRoZSBndWFyZHJhaWxzIFMzIGJ1Y2tldFxuICAgIGNvbnN0IGd1YXJkcmFpbHNCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdHdWFyZHJhaWxzQnVja2V0TmV3Jywge1xuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgfSk7XG5cbiAgICAvLyBEZXBsb3kgeW91ciBndWFyZHJhaWxVdHRlcmFuY2VzLmpzb24gaW50byB0aGF0IGJ1Y2tldFxuICAgIG5ldyBzM2RlcGxveS5CdWNrZXREZXBsb3ltZW50KHRoaXMsICdEZXBsb3lHdWFyZHJhaWxzSnNvbk5ldycsIHtcbiAgICAgIHNvdXJjZXM6IFtzM2RlcGxveS5Tb3VyY2UuYXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYS9qc29uJykpXSxcbiAgICAgIGRlc3RpbmF0aW9uQnVja2V0OiBndWFyZHJhaWxzQnVja2V0LFxuICAgICAgZGVzdGluYXRpb25LZXlQcmVmaXg6ICcnLFxuICAgIH0pO1xuXG4gICAgLy8gMSkgQ3JlYXRlIHRoZSBuZXcgR3VhcmRyYWlscyBMYW1iZGFcbiAgICBjb25zdCBndWFyZHJhaWxzRm4gPSBuZXcgbGFtYmRhTm9kZS5Ob2RlanNGdW5jdGlvbihcbiAgICAgIHRoaXMsXG4gICAgICAnR3VhcmRyYWlsc0Z1bmN0aW9uJyxcbiAgICAgIHtcbiAgICAgICAgZW50cnk6ICdsYW1iZGEvZ3VhcmRyYWlsc0FQSUhhbmRsZXIudHMnLCAvLyBUaGlzIGZpbGUgc2hvdWxkIGhhbmRsZSBHRVQvUE9TVC9ERUxFVEUgbG9naWNcbiAgICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgICAgZm9ybWF0OiBsYW1iZGFOb2RlLk91dHB1dEZvcm1hdC5DSlMsXG4gICAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ2F3cy1zZGsnXSxcbiAgICAgICAgfSxcbiAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICBHVUFSRFJBSUxTX0JVQ0tFVDogZ3VhcmRyYWlsc0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgICAgIEdVQVJEUkFJTFNfS0VZOiAnZ3VhcmRyYWlsVXR0ZXJhbmNlcy5qc29uJyxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgLy8gR3JhbnQgcmVhZCBwZXJtaXNzaW9ucyB0byB0aGUgZ3VhcmRyYWlscyBMYW1iZGFcbiAgICBndWFyZHJhaWxzQnVja2V0LmdyYW50UmVhZChndWFyZHJhaWxzRm4pO1xuXG4gICAgLy8gMikgKE9wdGlvbmFsKSBHcmFudCBvdGhlciBuZWNlc3NhcnkgcGVybWlzc2lvbnMgaWYgbmVlZGVkLCBlLmcuOlxuICAgIC8vIGd1YXJkcmFpbHNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZ3VhcmRyYWlsc0ZuKTtcblxuICAgIC8vIDMpIENyZWF0ZSB0aGUgL2d1YXJkcmFpbHMgcmVzb3VyY2VcbiAgICBjb25zdCBndWFyZHJhaWxzUmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnZ3VhcmRyYWlscycpO1xuXG4gICAgLy8gR0VUIC9ndWFyZHJhaWxzXG4gICAgZ3VhcmRyYWlsc1Jlc291cmNlLmFkZE1ldGhvZChcbiAgICAgICdHRVQnLFxuICAgICAgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ3VhcmRyYWlsc0ZuKVxuICAgICk7XG5cbiAgICAvLyBQT1NUIC9ndWFyZHJhaWxzXG4gICAgZ3VhcmRyYWlsc1Jlc291cmNlLmFkZE1ldGhvZChcbiAgICAgICdQT1NUJyxcbiAgICAgIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGd1YXJkcmFpbHNGbilcbiAgICApO1xuXG4gICAgLy8gREVMRVRFIC9ndWFyZHJhaWxzL3tpZH1cbiAgICBjb25zdCBzaW5nbGVHdWFyZHJhaWxSZXNvdXJjZSA9IGd1YXJkcmFpbHNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2lkfScpO1xuICAgIHNpbmdsZUd1YXJkcmFpbFJlc291cmNlLmFkZE1ldGhvZChcbiAgICAgICdERUxFVEUnLFxuICAgICAgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ3VhcmRyYWlsc0ZuKVxuICAgICk7XG5cbiAgICAvLyAtLS0tIEVORCBORVcgR1VBUkRSQUlMUyBTRUNUSU9OIC0tLS1cblxuICAgIC8vIFMzIEJ1Y2tldCBmb3IgRnJvbnRlbmRcbiAgICBjb25zdCBmcm9udGVuZEJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0Zyb250ZW5kQnVja2V0Jywge1xuICAgICAgd2Vic2l0ZUluZGV4RG9jdW1lbnQ6ICdpbmRleC5odG1sJyxcbiAgICAgIHdlYnNpdGVFcnJvckRvY3VtZW50OiAnaW5kZXguaHRtbCcsXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IHRydWUsXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogbmV3IHMzLkJsb2NrUHVibGljQWNjZXNzKHtcbiAgICAgICAgYmxvY2tQdWJsaWNBY2xzOiBmYWxzZSxcbiAgICAgICAgaWdub3JlUHVibGljQWNsczogZmFsc2UsXG4gICAgICAgIGJsb2NrUHVibGljUG9saWN5OiBmYWxzZSxcbiAgICAgICAgcmVzdHJpY3RQdWJsaWNCdWNrZXRzOiBmYWxzZSxcbiAgICAgIH0pLFxuICAgIH0pO1xuXG4gICAgZnJvbnRlbmRCdWNrZXQuYWRkVG9SZXNvdXJjZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogWydzMzpHZXRPYmplY3QnXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbYCR7ZnJvbnRlbmRCdWNrZXQuYnVja2V0QXJufS8qYF0sXG4gICAgICAgIHByaW5jaXBhbHM6IFtuZXcgaWFtLkFueVByaW5jaXBhbCgpXSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vIERlZmluZSB0aGUgbG9ncyBhbmQgY29uZmlnIGVuZHBvaW50c1xuICAgIGNvbnN0IGFwaUVuZHBvaW50ID0gYCR7YXBpLnVybH1gO1xuXG4gICAgLy8gSW5qZWN0IHRoZSBlbmRwb2ludHMgdmlhIGNvbmZpZy5qc1xuICAgIGNvbnN0IGNvbmZpZ0pzQ29udGVudCA9IGBcbiAgICAgIHdpbmRvdy5BUElfRU5EUE9JTlQgPSAke0pTT04uc3RyaW5naWZ5KGFwaUVuZHBvaW50KX07XG4gICAgYDtcblxuICAgIC8vIERlcGxveSBmcm9udGVuZCBmcm9tIC9mcm9udGVuZC11aS9kaXN0XG4gICAgbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQodGhpcywgJ0RlcGxveUZyb250ZW5kJywge1xuICAgICAgc291cmNlczogW1xuICAgICAgICBzM2RlcGxveS5Tb3VyY2UuYXNzZXQoXG4gICAgICAgICAgcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJ2Zyb250ZW5kLXVpJywgJ2Rpc3QnKSAvLyA8LS0gYWRhcHQgcGF0aCBpZiBuZWVkZWRcbiAgICAgICAgKSxcbiAgICAgICAgczNkZXBsb3kuU291cmNlLmRhdGEoJ2NvbmZpZy5qcycsIGNvbmZpZ0pzQ29udGVudCksXG4gICAgICBdLFxuICAgICAgZGVzdGluYXRpb25CdWNrZXQ6IGZyb250ZW5kQnVja2V0LFxuICAgIH0pO1xuXG4gICAgLy8gTkVXOiBPdXRwdXQgdGhlIGRlcGxveWVkIHdlYnNpdGUgVVJMIG9mIHRoZSBTMyBmcm9udGVuZCBidWNrZXRcbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsICdGcm9udGVuZEJ1Y2tldFVybCcsIHtcbiAgICAgIHZhbHVlOiBmcm9udGVuZEJ1Y2tldC5idWNrZXRXZWJzaXRlVXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdVUkwgZm9yIHRoZSBkZXBsb3llZCBmcm9udGVuZCBTMyBidWNrZXQgd2Vic2l0ZScsXG4gICAgfSk7XG5cbiAgICAvLyBlbmNyeXB0aW9uUG9saWN5LmFwcGx5UmVtb3ZhbFBvbGljeShSZW1vdmFsUG9saWN5LkRFU1RST1kpO1xuICAgIC8vIGFjY2Vzc1BvbGljeS5hcHBseVJlbW92YWxQb2xpY3koUmVtb3ZhbFBvbGljeS5ERVNUUk9ZKTtcbiAgICAvLyB2ZWN0b3JDb2xsZWN0aW9uLmFwcGx5UmVtb3ZhbFBvbGljeShSZW1vdmFsUG9saWN5LkRFU1RST1kpO1xuICAgIGF0aGVuYURhdGFiYXNlLmFwcGx5UmVtb3ZhbFBvbGljeShSZW1vdmFsUG9saWN5LkRFU1RST1kpO1xuICAgIGF0aGVuYVRhYmxlLmFwcGx5UmVtb3ZhbFBvbGljeShSZW1vdmFsUG9saWN5LkRFU1RST1kpO1xuICAgIC8vIGNyZWF0ZVZlY3RvckluZGV4LmFwcGx5UmVtb3ZhbFBvbGljeShSZW1vdmFsUG9saWN5LkRFU1RST1kpO1xuICAgIC8vIGNyZWF0ZUd1YXJkcmFpbHNJbmRleC5hcHBseVJlbW92YWxQb2xpY3koUmVtb3ZhbFBvbGljeS5ERVNUUk9ZKTtcbiAgfVxufVxuIl19