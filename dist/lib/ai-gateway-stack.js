"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiGatewayStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const cr = require("aws-cdk-lib/custom-resources");
const path = require("path");
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
        // SEMANTIC CACHE ITEMS START
        // Security policy for OpenSearch Serverless collection for semantic cache
        const encryptionPolicy = new aws_cdk_lib_1.aws_opensearchserverless.CfnSecurityPolicy(this, 'OpenSearchEncryptionPolicy', {
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
        // allow public network access to OpenSearch - tighten this down?
        const accessPolicy = new aws_cdk_lib_1.aws_opensearchserverless.CfnSecurityPolicy(this, 'PublicNetworkPolicy', {
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
        const vectorCollection = new aws_cdk_lib_1.aws_opensearchserverless.CfnCollection(this, 'SemanticCacheCollection', {
            name: 'semantic-cache',
            type: 'VECTORSEARCH',
            // "dev-test mode" - disabling replicas should cut cost in half
            standbyReplicas: 'DISABLED',
        });
        vectorCollection.node.addDependency(encryptionPolicy);
        vectorCollection.node.addDependency(accessPolicy);
        // IAM role for Lambda to invoke Bedrock models and access OpenSearch API
        const semanticCacheLambdaRole = new aws_cdk_lib_1.aws_iam.Role(this, 'SemanticCacheLambdaRole', {
            assumedBy: new aws_cdk_lib_1.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                aws_cdk_lib_1.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
            ]
        });
        new aws_cdk_lib_1.aws_opensearchserverless.CfnAccessPolicy(this, 'OpenSearchAccessPolicy', {
            name: 'semantic-cache-access-policy',
            type: 'data',
            policy: JSON.stringify([
                {
                    Rules: [
                        {
                            ResourceType: "collection",
                            Resource: [`collection/${vectorCollection.name}`],
                            Permission: ["aoss:*"],
                        },
                        {
                            ResourceType: "index",
                            Resource: ["index/*/*"],
                            Permission: ["aoss:*"]
                        }
                    ],
                    Principal: [
                        semanticCacheLambdaRole.roleArn,
                        `arn:aws:iam::${aws_cdk_lib_1.Aws.ACCOUNT_ID}:root`,
                    ]
                }
            ])
        });
        semanticCacheLambdaRole.addToPolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            actions: ['bedrock:InvokeModel'],
            // TODO: limit this to a specific Bedrock model(s)?
            resources: ['*']
        }));
        semanticCacheLambdaRole.addToPolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            actions: [
                'aoss:ReadDocument',
                'aoss:WriteDocument',
                'aoss:DescribeCollectionItems',
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
        new aws_cdk_lib_1.CfnOutput(this, 'OpenSearchEndpoint', {
            value: `${vectorCollection.attrCollectionEndpoint}`,
            exportName: 'OpenSearchCollectionEndpoint',
        });
        new aws_cdk_lib_1.CfnOutput(this, 'OpenSearchCollectionAttrId', {
            value: `${vectorCollection.attrId}`,
            exportName: 'OpenSearchCollectionAttrId',
        });
        // SEMANTIC CACHE ITEMS END
        // Secrets Manager for API Keys
        const llmApiKeys = new aws_cdk_lib_1.aws_secretsmanager.Secret(this, 'LLMProviderKeys', {
            secretName: 'llm-provider-api-keys',
            secretObjectValue: {
                ANTHROPIC_API_KEY: aws_cdk_lib_1.SecretValue.unsafePlainText('your-api-key'),
                GEMINI_API_KEY: aws_cdk_lib_1.SecretValue.unsafePlainText('your-api-key'),
                OPENAI_API_KEY: aws_cdk_lib_1.SecretValue.unsafePlainText('your-api-key'),
            },
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
        athenaWorkgroup.applyRemovalPolicy(aws_cdk_lib_1.RemovalPolicy.RETAIN);
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
                        'projection.model.values': 'gpt-3.5-turbo,gpt-4,claude-3-opus-20240229,gemini-1.5-pro,unknown',
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
                        InputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
                        OutputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
                        SerdeInfo: {
                            SerializationLibrary: 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe',
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
        logBucket.grantRead(new aws_cdk_lib_1.aws_iam.ServicePrincipal('athena.amazonaws.com'));
        // Router Lambda
        const routerFn = new aws_cdk_lib_1.aws_lambda_nodejs.NodejsFunction(this, 'RouterFunction', {
            entry: 'lambda/router.ts',
            handler: 'handler',
            runtime: aws_cdk_lib_1.aws_lambda.Runtime.NODEJS_18_X,
            timeout: aws_cdk_lib_1.Duration.seconds(30),
            // comment out line below if not using semantic cache
            role: semanticCacheLambdaRole,
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
                OPENSEARCH_ENDPOINT: vectorCollection.attrCollectionEndpoint,
                OPENSEARCH_INDEX: 'semantic-cache-index',
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
        // API Gateway with CORS
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
        const logsIntegration = new aws_cdk_lib_1.aws_apigateway.LambdaIntegration(logsFn, {
            proxy: false, // Non-proxy to control response
            integrationResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': "'*'",
                        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'",
                    },
                },
                {
                    statusCode: '500', // Handle errors
                    selectionPattern: '5\\d{2}',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': "'*'",
                        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'",
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
        // Define the logs endpoint
        const logsEndpoint = `${api.url}logs`;
        // Inject the endpoint via config.js
        const configJsContent = `
      window.LOGS_ENDPOINT = ${JSON.stringify(logsEndpoint)};
    `;
        // Deploy frontend from /frontend-ui/dist
        new aws_cdk_lib_1.aws_s3_deployment.BucketDeployment(this, 'DeployFrontend', {
            sources: [
                aws_cdk_lib_1.aws_s3_deployment.Source.asset(path.join(__dirname, '..', 'frontend-ui', 'dist')), // Updated path
                aws_cdk_lib_1.aws_s3_deployment.Source.data('config.js', configJsContent),
            ],
            destinationBucket: frontendBucket,
        });
    }
}
exports.AiGatewayStack = AiGatewayStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWktZ2F0ZXdheS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9haS1nYXRld2F5LXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDZDQXFCcUI7QUFDckIsbURBQW1EO0FBSW5ELDZCQUE2QjtBQUU3QixNQUFhLGNBQWUsU0FBUSxtQkFBSztJQUN2QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWtCO1FBQzFELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLHFCQUFxQjtRQUNyQixNQUFNLFNBQVMsR0FBRyxJQUFJLG9CQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDcEQsYUFBYSxFQUFFLDJCQUFhLENBQUMsT0FBTztZQUNwQyxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGNBQWMsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7U0FDcEQsQ0FBQyxDQUFDO1FBRUgsU0FBUyxDQUFDLG1CQUFtQixDQUMzQixJQUFJLHFCQUFHLENBQUMsZUFBZSxDQUFDO1lBQ3RCLE9BQU8sRUFBRTtnQkFDUCxjQUFjO2dCQUNkLGNBQWM7Z0JBQ2QsZUFBZTtnQkFDZixzQkFBc0I7YUFDdkI7WUFDRCxVQUFVLEVBQUUsQ0FBQyxJQUFJLHFCQUFHLENBQUMsZ0JBQWdCLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUM5RCxTQUFTLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLEdBQUcsU0FBUyxDQUFDLFNBQVMsSUFBSSxDQUFDO1NBQzdELENBQUMsQ0FDSCxDQUFDO1FBRUYsTUFBTSxZQUFZLEdBQUcsSUFBSSwwQkFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDL0QsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJ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QUFpQixFQUFFLGNBQWM7U0FDbEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBcGlCRCx3Q0FvaUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQge1xuICBBd3MsXG4gIGF3c19sYW1iZGEgYXMgbGFtYmRhLFxuICBhd3NfbGFtYmRhX25vZGVqcyBhcyBsYW1iZGFOb2RlLFxuICBhd3NfYXBpZ2F0ZXdheSBhcyBhcGlnYXRld2F5LFxuICBhd3Nfc2VjcmV0c21hbmFnZXIgYXMgc2VjcmV0c21hbmFnZXIsXG4gIGF3c19keW5hbW9kYiBhcyBkeW5hbW9kYixcbiAgYXdzX2lhbSBhcyBpYW0sXG4gIGF3c19sb2dzIGFzIGxvZ3MsXG4gIGF3c19zMyBhcyBzMyxcbiAgYXdzX2F0aGVuYSBhcyBhdGhlbmEsXG4gIGF3c19vcGVuc2VhcmNoc2VydmVybGVzcyBhcyBvcGVuc2VhcmNoLFxuICBDZm5PdXRwdXQsXG4gIGF3c19zM19kZXBsb3ltZW50IGFzIHMzZGVwbG95LFxuICBDZm5SZXNvdXJjZSxcbiAgU3RhY2ssXG4gIFN0YWNrUHJvcHMsXG4gIER1cmF0aW9uLFxuICBSZW1vdmFsUG9saWN5LFxuICBTZWNyZXRWYWx1ZSxcbiAgUmVzb3VyY2UsXG59IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGNyIGZyb20gJ2F3cy1jZGstbGliL2N1c3RvbS1yZXNvdXJjZXMnO1xuaW1wb3J0IHsgdGltZVN0YW1wIH0gZnJvbSAnY29uc29sZSc7XG5pbXBvcnQgeyBSZXNvdXJjZVR5cGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29uZmlnJztcbmltcG9ydCB7IFBlcm1pc3Npb24gfSBmcm9tICdAYXdzLXNkay9jbGllbnQtczMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGNsYXNzIEFpR2F0ZXdheVN0YWNrIGV4dGVuZHMgU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIFMzIGJ1Y2tldCBmb3IgbG9nc1xuICAgIGNvbnN0IGxvZ0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0xMTUxvZ0J1Y2tldCcsIHtcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IFt7IGV4cGlyYXRpb246IER1cmF0aW9uLmRheXMoOTApIH1dLFxuICAgIH0pO1xuXG4gICAgbG9nQnVja2V0LmFkZFRvUmVzb3VyY2VQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAnczM6UHV0T2JqZWN0JyxcbiAgICAgICAgICAnczM6R2V0T2JqZWN0JyxcbiAgICAgICAgICAnczM6TGlzdEJ1Y2tldCcsXG4gICAgICAgICAgJ3MzOkdldEJ1Y2tldExvY2F0aW9uJyxcbiAgICAgICAgXSxcbiAgICAgICAgcHJpbmNpcGFsczogW25ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnYXRoZW5hLmFtYXpvbmF3cy5jb20nKV0sXG4gICAgICAgIHJlc291cmNlczogW2xvZ0J1Y2tldC5idWNrZXRBcm4sIGAke2xvZ0J1Y2tldC5idWNrZXRBcm59LypgXSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIGNvbnN0IG1lc3NhZ2VUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnTExNTWVzc2FnZVRhYmxlJywge1xuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd0aHJlYWRJRCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd0aW1lc3RhbXAnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICB9KTtcblxuICAgIC8vIER5bmFtb0RCIHRhYmxlXG4gICAgY29uc3QgYWlHYXRld2F5TG9nc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdBaUdhdGV3YXlMb2dzVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6ICdhaS1nYXRld2F5LWxvZ3MtdGFibGUnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdQSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdTSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gU2ltcGxlIGNhY2hpbmcgRHluYW1vREIgdGFibGVcbiAgICBjb25zdCBhaUdhdGV3YXlDYWNoZVRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdBaUdhdGV3YXlDYWNoZVRhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiAnYWktZ2F0ZXdheS1jYWNoZS10YWJsZScsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjYWNoZUtleScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ3R0bCcsIC8vIEF1dG9tYXRpY2FsbHkgcmVtb3ZlIGV4cGlyZWQgaXRlbXNcbiAgICB9KTtcblxuICAgIC8vIFNFTUFOVElDIENBQ0hFIElURU1TIFNUQVJUXG4gICAgLy8gU2VjdXJpdHkgcG9saWN5IGZvciBPcGVuU2VhcmNoIFNlcnZlcmxlc3MgY29sbGVjdGlvbiBmb3Igc2VtYW50aWMgY2FjaGVcbiAgICBjb25zdCBlbmNyeXB0aW9uUG9saWN5ID0gbmV3IG9wZW5zZWFyY2guQ2ZuU2VjdXJpdHlQb2xpY3kodGhpcywgJ09wZW5TZWFyY2hFbmNyeXB0aW9uUG9saWN5Jywge1xuICAgICAgbmFtZTogJ3NlbWFudGljLWNhY2hlLWVuY3J5cHRpb24tcG9saWN5JyxcbiAgICAgIHR5cGU6ICdlbmNyeXB0aW9uJyxcbiAgICAgIHBvbGljeTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBSdWxlczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIFJlc291cmNlVHlwZTogJ2NvbGxlY3Rpb24nLFxuICAgICAgICAgICAgUmVzb3VyY2U6IFsnY29sbGVjdGlvbi9zZW1hbnRpYy1jYWNoZSddXG4gICAgICAgICAgfVxuICAgICAgICBdLFxuICAgICAgICBBV1NPd25lZEtleTogdHJ1ZVxuICAgICAgfSlcbiAgICB9KTtcblxuICAgIC8vIGFsbG93IHB1YmxpYyBuZXR3b3JrIGFjY2VzcyB0byBPcGVuU2VhcmNoIC0gdGlnaHRlbiB0aGlzIGRvd24/XG4gICAgY29uc3QgYWNjZXNzUG9saWN5ID0gbmV3IG9wZW5zZWFyY2guQ2ZuU2VjdXJpdHlQb2xpY3kodGhpcywgJ1B1YmxpY05ldHdvcmtQb2xpY3knLCB7XG4gICAgICBuYW1lOiAncHVibGljLW5ldHdvcmstcG9saWN5JyxcbiAgICAgIHR5cGU6ICduZXR3b3JrJyxcbiAgICAgIHBvbGljeTogSlNPTi5zdHJpbmdpZnkoW1xuICAgICAgICB7XG4gICAgICAgICAgUnVsZXM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgUmVzb3VyY2VUeXBlOiAnY29sbGVjdGlvbicsXG4gICAgICAgICAgICAgIFJlc291cmNlOiBbJ2NvbGxlY3Rpb24vc2VtYW50aWMtY2FjaGUnXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBBbGxvd0Zyb21QdWJsaWM6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICBdKSxcbiAgICB9KTtcblxuICAgIC8vIE9wZW5TZWFyY2ggU2VydmVybGVzcyBjb2xsZWN0aW9uIGZvciBzZW1hbnRpYyBjYWNoZVxuICAgIGNvbnN0IHZlY3RvckNvbGxlY3Rpb24gPSBuZXcgb3BlbnNlYXJjaC5DZm5Db2xsZWN0aW9uKHRoaXMsICdTZW1hbnRpY0NhY2hlQ29sbGVjdGlvbicsIHtcbiAgICAgIG5hbWU6ICdzZW1hbnRpYy1jYWNoZScsXG4gICAgICB0eXBlOiAnVkVDVE9SU0VBUkNIJyxcbiAgICAgIC8vIFwiZGV2LXRlc3QgbW9kZVwiIC0gZGlzYWJsaW5nIHJlcGxpY2FzIHNob3VsZCBjdXQgY29zdCBpbiBoYWxmXG4gICAgICBzdGFuZGJ5UmVwbGljYXM6ICdESVNBQkxFRCcsXG4gICAgfSk7XG5cbiAgICB2ZWN0b3JDb2xsZWN0aW9uLm5vZGUuYWRkRGVwZW5kZW5jeShlbmNyeXB0aW9uUG9saWN5KTtcbiAgICB2ZWN0b3JDb2xsZWN0aW9uLm5vZGUuYWRkRGVwZW5kZW5jeShhY2Nlc3NQb2xpY3kpO1xuXG4gICAgLy8gSUFNIHJvbGUgZm9yIExhbWJkYSB0byBpbnZva2UgQmVkcm9jayBtb2RlbHMgYW5kIGFjY2VzcyBPcGVuU2VhcmNoIEFQSVxuICAgIGNvbnN0IHNlbWFudGljQ2FjaGVMYW1iZGFSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdTZW1hbnRpY0NhY2hlTGFtYmRhUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpXG4gICAgICBdXG4gICAgfSk7XG5cbiAgICBuZXcgb3BlbnNlYXJjaC5DZm5BY2Nlc3NQb2xpY3kodGhpcywgJ09wZW5TZWFyY2hBY2Nlc3NQb2xpY3knLCB7XG4gICAgICBuYW1lOiAnc2VtYW50aWMtY2FjaGUtYWNjZXNzLXBvbGljeScsXG4gICAgICB0eXBlOiAnZGF0YScsXG4gICAgICBwb2xpY3k6IEpTT04uc3RyaW5naWZ5KFtcbiAgICAgICAge1xuICAgICAgICAgIFJ1bGVzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFJlc291cmNlVHlwZTogXCJjb2xsZWN0aW9uXCIsXG4gICAgICAgICAgICAgIFJlc291cmNlOiBbYGNvbGxlY3Rpb24vJHt2ZWN0b3JDb2xsZWN0aW9uLm5hbWV9YF0sXG4gICAgICAgICAgICAgIFBlcm1pc3Npb246IFtcImFvc3M6KlwiXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFJlc291cmNlVHlwZTogXCJpbmRleFwiLFxuICAgICAgICAgICAgICBSZXNvdXJjZTogW1wiaW5kZXgvKi8qXCJdLFxuICAgICAgICAgICAgICBQZXJtaXNzaW9uOiBbXCJhb3NzOipcIl1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdLFxuICAgICAgICAgIFByaW5jaXBhbDogW1xuICAgICAgICAgICAgc2VtYW50aWNDYWNoZUxhbWJkYVJvbGUucm9sZUFybixcbiAgICAgICAgICAgIGBhcm46YXdzOmlhbTo6JHtBd3MuQUNDT1VOVF9JRH06cm9vdGAsIFxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXSlcbiAgICB9KTtcblxuICAgIHNlbWFudGljQ2FjaGVMYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsnYmVkcm9jazpJbnZva2VNb2RlbCddLFxuICAgICAgLy8gVE9ETzogbGltaXQgdGhpcyB0byBhIHNwZWNpZmljIEJlZHJvY2sgbW9kZWwocyk/XG4gICAgICByZXNvdXJjZXM6IFsnKiddXG4gICAgfSkpOyAgICBcblxuICAgIHNlbWFudGljQ2FjaGVMYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ2Fvc3M6UmVhZERvY3VtZW50JyxcbiAgICAgICAgJ2Fvc3M6V3JpdGVEb2N1bWVudCcsXG4gICAgICAgICdhb3NzOkRlc2NyaWJlQ29sbGVjdGlvbkl0ZW1zJyxcbiAgICAgICAgJ2Fvc3M6RGVzY3JpYmVDb2xsZWN0aW9uJyxcbiAgICAgICAgJ2Fvc3M6TGlzdENvbGxlY3Rpb25zJyxcbiAgICAgICAgJ2Fvc3M6QVBJQWNjZXNzQWxsJyxcbiAgICAgIF0sXG4gICAgICAvLyBUT0RPOiBsaW1pdCB0aGlzIG1vcmUgdG8gc3BlY2lmaWMgcmVzb3VyY2VzP1xuICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgIGBhcm46YXdzOmFvc3M6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OipgLFxuICAgICAgICBgYXJuOmF3czphb3NzOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTpjb2xsZWN0aW9uL3NlbWFudGljLWNhY2hlYCxcbiAgICAgICAgYGFybjphd3M6YW9zczoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06aW5kZXgvc2VtYW50aWMtY2FjaGUvKmBcbiAgICAgIF1cbiAgICB9KSk7XG4gICAgXG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCAnT3BlblNlYXJjaEVuZHBvaW50Jywge1xuICAgICAgdmFsdWU6IGAke3ZlY3RvckNvbGxlY3Rpb24uYXR0ckNvbGxlY3Rpb25FbmRwb2ludH1gLFxuICAgICAgZXhwb3J0TmFtZTogJ09wZW5TZWFyY2hDb2xsZWN0aW9uRW5kcG9pbnQnLFxuICAgIH0pO1xuXG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCAnT3BlblNlYXJjaENvbGxlY3Rpb25BdHRySWQnLCB7XG4gICAgICB2YWx1ZTogYCR7dmVjdG9yQ29sbGVjdGlvbi5hdHRySWR9YCxcbiAgICAgIGV4cG9ydE5hbWU6ICdPcGVuU2VhcmNoQ29sbGVjdGlvbkF0dHJJZCcsXG4gICAgfSk7XG4gICAgLy8gU0VNQU5USUMgQ0FDSEUgSVRFTVMgRU5EXG5cbiAgICAvLyBTZWNyZXRzIE1hbmFnZXIgZm9yIEFQSSBLZXlzXG4gICAgY29uc3QgbGxtQXBpS2V5cyA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ0xMTVByb3ZpZGVyS2V5cycsIHtcbiAgICAgIHNlY3JldE5hbWU6ICdsbG0tcHJvdmlkZXItYXBpLWtleXMnLFxuICAgICAgc2VjcmV0T2JqZWN0VmFsdWU6IHtcbiAgICAgICAgQU5USFJPUElDX0FQSV9LRVk6IFNlY3JldFZhbHVlLnVuc2FmZVBsYWluVGV4dCgneW91ci1hcGkta2V5JyksXG4gICAgICAgIEdFTUlOSV9BUElfS0VZOiBTZWNyZXRWYWx1ZS51bnNhZmVQbGFpblRleHQoJ3lvdXItYXBpLWtleScpLFxuICAgICAgICBPUEVOQUlfQVBJX0tFWTogU2VjcmV0VmFsdWUudW5zYWZlUGxhaW5UZXh0KCd5b3VyLWFwaS1rZXknKSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBBdGhlbmEgd29ya2dyb3VwXG4gICAgY29uc3QgYXRoZW5hV29ya2dyb3VwTmFtZSA9IGAke3RoaXMuc3RhY2tOYW1lfS1sbG1fbG9nc193b3JrZ3JvdXBgO1xuICAgIGNvbnN0IGF0aGVuYVdvcmtncm91cCA9IG5ldyBhdGhlbmEuQ2ZuV29ya0dyb3VwKHRoaXMsICdBdGhlbmFXb3JrZ3JvdXAnLCB7XG4gICAgICBuYW1lOiBhdGhlbmFXb3JrZ3JvdXBOYW1lLFxuICAgICAgc3RhdGU6ICdFTkFCTEVEJyxcbiAgICAgIHdvcmtHcm91cENvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgcmVzdWx0Q29uZmlndXJhdGlvbjoge1xuICAgICAgICAgIG91dHB1dExvY2F0aW9uOiBgczM6Ly8ke2xvZ0J1Y2tldC5idWNrZXROYW1lfS9hdGhlbmEtcmVzdWx0cy9gLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcbiAgICBhdGhlbmFXb3JrZ3JvdXAuYXBwbHlSZW1vdmFsUG9saWN5KFJlbW92YWxQb2xpY3kuUkVUQUlOKTtcblxuICAgIGNvbnN0IGF0aGVuYUNsZWFudXAgPSBuZXcgY3IuQXdzQ3VzdG9tUmVzb3VyY2UoXG4gICAgICB0aGlzLFxuICAgICAgJ0F0aGVuYVdvcmtncm91cENsZWFudXAnLFxuICAgICAge1xuICAgICAgICBvbkRlbGV0ZToge1xuICAgICAgICAgIHNlcnZpY2U6ICdBdGhlbmEnLFxuICAgICAgICAgIGFjdGlvbjogJ2RlbGV0ZVdvcmtHcm91cCcsXG4gICAgICAgICAgcGFyYW1ldGVyczoge1xuICAgICAgICAgICAgV29ya0dyb3VwOiBhdGhlbmFXb3JrZ3JvdXBOYW1lLFxuICAgICAgICAgICAgUmVjdXJzaXZlRGVsZXRlT3B0aW9uOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcGh5c2ljYWxSZXNvdXJjZUlkOiBjci5QaHlzaWNhbFJlc291cmNlSWQub2YoYXRoZW5hV29ya2dyb3VwTmFtZSksXG4gICAgICAgIH0sXG4gICAgICAgIHBvbGljeTogY3IuQXdzQ3VzdG9tUmVzb3VyY2VQb2xpY3kuZnJvbVNka0NhbGxzKHtcbiAgICAgICAgICByZXNvdXJjZXM6IGNyLkF3c0N1c3RvbVJlc291cmNlUG9saWN5LkFOWV9SRVNPVVJDRSxcbiAgICAgICAgfSksXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIH1cbiAgICApO1xuICAgIGxvZ0J1Y2tldC5ub2RlLmFkZERlcGVuZGVuY3koYXRoZW5hQ2xlYW51cCk7XG5cbiAgICAvLyBHbHVlIERhdGFiYXNlIGFuZCBUYWJsZVxuICAgIGNvbnN0IGF0aGVuYURhdGFiYXNlID0gbmV3IENmblJlc291cmNlKHRoaXMsICdBdGhlbmFEYXRhYmFzZScsIHtcbiAgICAgIHR5cGU6ICdBV1M6OkdsdWU6OkRhdGFiYXNlJyxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgQ2F0YWxvZ0lkOiB0aGlzLmFjY291bnQsXG4gICAgICAgIERhdGFiYXNlSW5wdXQ6IHtcbiAgICAgICAgICBOYW1lOiAnYWlfZ2F0ZXdheV9sb2dzX2RiJyxcbiAgICAgICAgICBEZXNjcmlwdGlvbjogJ0RhdGFiYXNlIGZvciBBSSBHYXRld2F5IGxvZ3MnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGF0aGVuYVRhYmxlID0gbmV3IENmblJlc291cmNlKHRoaXMsICdBSUdhdGV3YXlMb2dzVGFibGUnLCB7XG4gICAgICB0eXBlOiAnQVdTOjpHbHVlOjpUYWJsZScsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIENhdGFsb2dJZDogdGhpcy5hY2NvdW50LFxuICAgICAgICBEYXRhYmFzZU5hbWU6ICdhaV9nYXRld2F5X2xvZ3NfZGInLFxuICAgICAgICBUYWJsZUlucHV0OiB7XG4gICAgICAgICAgTmFtZTogJ2FpX2dhdGV3YXlfbG9ncycsXG4gICAgICAgICAgVGFibGVUeXBlOiAnRVhURVJOQUxfVEFCTEUnLFxuICAgICAgICAgIFBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICdwcm9qZWN0aW9uLmVuYWJsZWQnOiAndHJ1ZScsXG4gICAgICAgICAgICAncHJvamVjdGlvbi5zdGF0dXMudHlwZSc6ICdlbnVtJyxcbiAgICAgICAgICAgICdwcm9qZWN0aW9uLnN0YXR1cy52YWx1ZXMnOiAnc3VjY2VzcyxmYWlsdXJlJyxcbiAgICAgICAgICAgICdwcm9qZWN0aW9uLmRhdGUudHlwZSc6ICdkYXRlJyxcbiAgICAgICAgICAgICdwcm9qZWN0aW9uLmRhdGUucmFuZ2UnOiAnMjAyNS0wMS0wMSxOT1cnLFxuICAgICAgICAgICAgJ3Byb2plY3Rpb24uZGF0ZS5mb3JtYXQnOiAneXl5eS1NTS1kZCcsXG4gICAgICAgICAgICAncHJvamVjdGlvbi5kYXRlLmludGVydmFsJzogJzEnLFxuICAgICAgICAgICAgJ3Byb2plY3Rpb24uZGF0ZS5pbnRlcnZhbC51bml0JzogJ0RBWVMnLFxuICAgICAgICAgICAgJ3Byb2plY3Rpb24ucHJvdmlkZXIudHlwZSc6ICdlbnVtJyxcbiAgICAgICAgICAgICdwcm9qZWN0aW9uLnByb3ZpZGVyLnZhbHVlcyc6ICdvcGVuYWksYW50aHJvcGljLGdlbWluaSx1bmtub3duJyxcbiAgICAgICAgICAgICdwcm9qZWN0aW9uLm1vZGVsLnR5cGUnOiAnZW51bScsXG4gICAgICAgICAgICAncHJvamVjdGlvbi5tb2RlbC52YWx1ZXMnOlxuICAgICAgICAgICAgICAnZ3B0LTMuNS10dXJibyxncHQtNCxjbGF1ZGUtMy1vcHVzLTIwMjQwMjI5LGdlbWluaS0xLjUtcHJvLHVua25vd24nLFxuICAgICAgICAgICAgJ3N0b3JhZ2UubG9jYXRpb24udGVtcGxhdGUnOiBgczM6Ly8ke2xvZ0J1Y2tldC5idWNrZXROYW1lfS9sb2dzL3BhcnF1ZXQvc3RhdHVzPVxcJHtzdGF0dXN9L2RhdGU9XFwke2RhdGV9L3Byb3ZpZGVyPVxcJHtwcm92aWRlcn0vbW9kZWw9XFwke21vZGVsfS9gLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgU3RvcmFnZURlc2NyaXB0b3I6IHtcbiAgICAgICAgICAgIENvbHVtbnM6IFtcbiAgICAgICAgICAgICAgeyBOYW1lOiAnaWQnLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICB7IE5hbWU6ICd0aHJlYWRfdHMnLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICB7IE5hbWU6ICd0aW1lc3RhbXAnLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICB7IE5hbWU6ICdsYXRlbmN5JywgVHlwZTogJ2JpZ2ludCcgfSxcbiAgICAgICAgICAgICAgeyBOYW1lOiAndG9rZW5zX3VzZWQnLCBUeXBlOiAnYmlnaW50JyB9LFxuICAgICAgICAgICAgICB7IE5hbWU6ICdjb3N0JywgVHlwZTogJ2RvdWJsZScgfSxcbiAgICAgICAgICAgICAgeyBOYW1lOiAncmF3X3JlcXVlc3QnLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICB7IE5hbWU6ICdyYXdfcmVzcG9uc2UnLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICB7IE5hbWU6ICdlcnJvcl9tZXNzYWdlJywgVHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBMb2NhdGlvbjogYHMzOi8vJHtsb2dCdWNrZXQuYnVja2V0TmFtZX0vbG9ncy9wYXJxdWV0L2AsXG4gICAgICAgICAgICBJbnB1dEZvcm1hdDpcbiAgICAgICAgICAgICAgJ29yZy5hcGFjaGUuaGFkb29wLmhpdmUucWwuaW8ucGFycXVldC5NYXByZWRQYXJxdWV0SW5wdXRGb3JtYXQnLFxuICAgICAgICAgICAgT3V0cHV0Rm9ybWF0OlxuICAgICAgICAgICAgICAnb3JnLmFwYWNoZS5oYWRvb3AuaGl2ZS5xbC5pby5wYXJxdWV0Lk1hcHJlZFBhcnF1ZXRPdXRwdXRGb3JtYXQnLFxuICAgICAgICAgICAgU2VyZGVJbmZvOiB7XG4gICAgICAgICAgICAgIFNlcmlhbGl6YXRpb25MaWJyYXJ5OlxuICAgICAgICAgICAgICAgICdvcmcuYXBhY2hlLmhhZG9vcC5oaXZlLnFsLmlvLnBhcnF1ZXQuc2VyZGUuUGFycXVldEhpdmVTZXJEZScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgUGFydGl0aW9uS2V5czogW1xuICAgICAgICAgICAgeyBOYW1lOiAnc3RhdHVzJywgVHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgIHsgTmFtZTogJ2RhdGUnLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgeyBOYW1lOiAncHJvdmlkZXInLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgeyBOYW1lOiAnbW9kZWwnLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuICAgIGF0aGVuYVRhYmxlLmFkZERlcGVuZGVuY3koYXRoZW5hRGF0YWJhc2UpO1xuICAgIGF0aGVuYURhdGFiYXNlLmFkZERlcGVuZGVuY3koYXRoZW5hV29ya2dyb3VwKTtcbiAgICBsb2dCdWNrZXQuZ3JhbnRSZWFkKG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnYXRoZW5hLmFtYXpvbmF3cy5jb20nKSk7XG5cbiAgICAvLyBSb3V0ZXIgTGFtYmRhXG4gICAgY29uc3Qgcm91dGVyRm4gPSBuZXcgbGFtYmRhTm9kZS5Ob2RlanNGdW5jdGlvbih0aGlzLCAnUm91dGVyRnVuY3Rpb24nLCB7XG4gICAgICBlbnRyeTogJ2xhbWJkYS9yb3V0ZXIudHMnLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICB0aW1lb3V0OiBEdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIC8vIGNvbW1lbnQgb3V0IGxpbmUgYmVsb3cgaWYgbm90IHVzaW5nIHNlbWFudGljIGNhY2hlXG4gICAgICByb2xlOiBzZW1hbnRpY0NhY2hlTGFtYmRhUm9sZSxcbiAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgIGZvcm1hdDogbGFtYmRhTm9kZS5PdXRwdXRGb3JtYXQuQ0pTLFxuICAgICAgICBleHRlcm5hbE1vZHVsZXM6IFsnYXdzLXNkayddLFxuICAgICAgICBub2RlTW9kdWxlczogWydAc21pdGh5L3V0aWwtdXRmOCddLFxuICAgICAgfSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIExPR19UQUJMRV9OQU1FOiBhaUdhdGV3YXlMb2dzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBTRUNSRVRfTkFNRTogbGxtQXBpS2V5cy5zZWNyZXROYW1lLFxuICAgICAgICBNRVNTQUdFX1RBQkxFX05BTUU6IG1lc3NhZ2VUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFNZU1RFTV9QUk9NUFQ6ICdZb3UgYXJlIGEgaGVscGZ1bCBhc3Npc3RhbnQuIFlvdSBhbnN3ZXIgaW4gY29ja25leS4nLFxuICAgICAgICBMT0dfQlVDS0VUX05BTUU6IGxvZ0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgICBDQUNIRV9UQUJMRV9OQU1FOiBhaUdhdGV3YXlDYWNoZVRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgT1BFTlNFQVJDSF9FTkRQT0lOVDogdmVjdG9yQ29sbGVjdGlvbi5hdHRyQ29sbGVjdGlvbkVuZHBvaW50LFxuICAgICAgICBPUEVOU0VBUkNIX0lOREVYOiAnc2VtYW50aWMtY2FjaGUtaW5kZXgnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIExvZ3MgTGFtYmRhXG4gICAgY29uc3QgbG9nc0ZuID0gbmV3IGxhbWJkYU5vZGUuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0xvZ3NGdW5jdGlvbicsIHtcbiAgICAgIGVudHJ5OiAnbGFtYmRhL2xvZ3MudHMnLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICB0aW1lb3V0OiBEdXJhdGlvbi5taW51dGVzKDMpLFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgZm9ybWF0OiBsYW1iZGFOb2RlLk91dHB1dEZvcm1hdC5DSlMsXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydhd3Mtc2RrJ10sXG4gICAgICB9LFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgTE9HX1RBQkxFX05BTUU6IGFpR2F0ZXdheUxvZ3NUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIExPR19CVUNLRVRfTkFNRTogbG9nQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICAgIEFUSEVOQV9XT1JLR1JPVVA6IGF0aGVuYVdvcmtncm91cE5hbWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQVBJIEdhdGV3YXkgd2l0aCBDT1JTXG4gICAgY29uc3QgYXBpR2F0ZXdheUxvZ1JvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0FwaUdhdGV3YXlDbG91ZFdhdGNoUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdhcGlnYXRld2F5LmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoXG4gICAgICAgICAgJ3NlcnZpY2Utcm9sZS9BbWF6b25BUElHYXRld2F5UHVzaFRvQ2xvdWRXYXRjaExvZ3MnXG4gICAgICAgICksXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgY29uc3QgbG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnR2F0ZXdheUFjY2Vzc0xvZ3MnLCB7XG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL2FwaWdhdGV3YXkvJHtpZH0vYWNjZXNzLWxvZ3NgLFxuICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuRk9VUl9NT05USFMsXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdBaUdhdGV3YXlSZXN0QXBpJywge1xuICAgICAgcmVzdEFwaU5hbWU6ICdBSSBHYXRld2F5IEFQSScsXG4gICAgICBkZXNjcmlwdGlvbjogJ1JvdXRlcyByZXF1ZXN0cyB0byB0aGUgYXBwcm9wcmlhdGUgTExNIHNlcnZpY2UuJyxcbiAgICAgIGFwaUtleVNvdXJjZVR5cGU6IGFwaWdhdGV3YXkuQXBpS2V5U291cmNlVHlwZS5IRUFERVIsXG4gICAgICBkZXBsb3lPcHRpb25zOiB7XG4gICAgICAgIHN0YWdlTmFtZTogJ2RldicsXG4gICAgICAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcbiAgICAgICAgZGF0YVRyYWNlRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgbWV0cmljc0VuYWJsZWQ6IHRydWUsXG4gICAgICAgIGFjY2Vzc0xvZ0Rlc3RpbmF0aW9uOiBuZXcgYXBpZ2F0ZXdheS5Mb2dHcm91cExvZ0Rlc3RpbmF0aW9uKGxvZ0dyb3VwKSxcbiAgICAgICAgYWNjZXNzTG9nRm9ybWF0OiBhcGlnYXRld2F5LkFjY2Vzc0xvZ0Zvcm1hdC5qc29uV2l0aFN0YW5kYXJkRmllbGRzKCksXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgY2ZuQWNjb3VudCA9IG5ldyBhcGlnYXRld2F5LkNmbkFjY291bnQodGhpcywgJ0FwaUdhdGV3YXlBY2NvdW50Jywge1xuICAgICAgY2xvdWRXYXRjaFJvbGVBcm46IGFwaUdhdGV3YXlMb2dSb2xlLnJvbGVBcm4sXG4gICAgfSk7XG4gICAgY2ZuQWNjb3VudC5ub2RlLmFkZERlcGVuZGVuY3koYXBpR2F0ZXdheUxvZ1JvbGUpO1xuICAgIGFwaS5ub2RlLmFkZERlcGVuZGVuY3koY2ZuQWNjb3VudCk7XG5cbiAgICBjb25zdCBnYXRld2F5S2V5ID0gbmV3IGFwaWdhdGV3YXkuQXBpS2V5KHRoaXMsICdHYXRld2F5S2V5Jywge1xuICAgICAgYXBpS2V5TmFtZTogJ2dhdGV3YXktYXBpLWtleScsXG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdXNhZ2VQbGFuID0gYXBpLmFkZFVzYWdlUGxhbignQmFzaWNVc2FnZVBsYW4nLCB7XG4gICAgICBuYW1lOiAnQmFzaWNVc2FnZVBsYW4nLFxuICAgICAgdGhyb3R0bGU6IHsgcmF0ZUxpbWl0OiAxMCwgYnVyc3RMaW1pdDogMjAgfSxcbiAgICB9KTtcbiAgICB1c2FnZVBsYW4uYWRkQXBpS2V5KGdhdGV3YXlLZXkpO1xuICAgIHVzYWdlUGxhbi5hZGRBcGlTdGFnZSh7IHN0YWdlOiBhcGkuZGVwbG95bWVudFN0YWdlIH0pO1xuXG4gICAgLy8gUGVybWlzc2lvbnNcbiAgICBhaUdhdGV3YXlDYWNoZVRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShyb3V0ZXJGbik7XG4gICAgYWlHYXRld2F5TG9nc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShyb3V0ZXJGbik7XG4gICAgbGxtQXBpS2V5cy5ncmFudFJlYWQocm91dGVyRm4pO1xuICAgIGxvZ0J1Y2tldC5ncmFudFJlYWRXcml0ZShyb3V0ZXJGbik7XG4gICAgYWlHYXRld2F5TG9nc1RhYmxlLmdyYW50UmVhZERhdGEobG9nc0ZuKTtcbiAgICBtZXNzYWdlVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHJvdXRlckZuKTtcbiAgICBsb2dCdWNrZXQuZ3JhbnRSZWFkV3JpdGUobG9nc0ZuKTtcbiAgICBsb2dzRm4uYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ2F0aGVuYTpTdGFydFF1ZXJ5RXhlY3V0aW9uJyxcbiAgICAgICAgICAnYXRoZW5hOkdldFF1ZXJ5RXhlY3V0aW9uJyxcbiAgICAgICAgICAnYXRoZW5hOkdldFF1ZXJ5UmVzdWx0cycsXG4gICAgICAgICAgJ2F0aGVuYTpMaXN0V29ya0dyb3VwcycsXG4gICAgICAgICAgJ2F0aGVuYTpHZXRXb3JrR3JvdXAnLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBgYXJuOmF3czphdGhlbmE6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9Ondvcmtncm91cC8ke2F0aGVuYVdvcmtncm91cE5hbWV9YCxcbiAgICAgICAgXSxcbiAgICAgIH0pXG4gICAgKTtcbiAgICBsb2dzRm4uYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ3MzOkdldE9iamVjdCcsXG4gICAgICAgICAgJ3MzOlB1dE9iamVjdCcsXG4gICAgICAgICAgJ3MzOkxpc3RCdWNrZXQnLFxuICAgICAgICAgICdzMzpHZXRCdWNrZXRMb2NhdGlvbicsXG4gICAgICAgIF0sXG4gICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgIGBhcm46YXdzOnMzOjo6JHtsb2dCdWNrZXQuYnVja2V0TmFtZX1gLFxuICAgICAgICAgIGBhcm46YXdzOnMzOjo6JHtsb2dCdWNrZXQuYnVja2V0TmFtZX0vKmAsXG4gICAgICAgIF0sXG4gICAgICB9KVxuICAgICk7XG4gICAgbG9nc0ZuLmFkZFRvUm9sZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICdnbHVlOkdldFRhYmxlJyxcbiAgICAgICAgICAnZ2x1ZTpHZXRUYWJsZXMnLFxuICAgICAgICAgICdnbHVlOkdldERhdGFiYXNlJyxcbiAgICAgICAgICAnZ2x1ZTpHZXREYXRhYmFzZXMnLFxuICAgICAgICAgICdnbHVlOkdldFBhcnRpdGlvbicsXG4gICAgICAgICAgJ2dsdWU6R2V0UGFydGl0aW9ucycsXG4gICAgICAgIF0sXG4gICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgIGBhcm46YXdzOmdsdWU6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OmNhdGFsb2dgLFxuICAgICAgICAgIGBhcm46YXdzOmdsdWU6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OmRhdGFiYXNlL2FpX2dhdGV3YXlfbG9nc19kYmAsXG4gICAgICAgICAgYGFybjphd3M6Z2x1ZToke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06dGFibGUvYWlfZ2F0ZXdheV9sb2dzX2RiL2FpX2dhdGV3YXlfbG9nc2AsXG4gICAgICAgIF0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBBUEkgcm91dGVzIHdpdGggZXhwbGljaXQgQ09SUyBjb25maWd1cmF0aW9uXG4gICAgY29uc3Qgcm91dGVySW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihyb3V0ZXJGbik7XG4gICAgY29uc3Qgcm91dGVSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdyb3V0ZScpO1xuICAgIHJvdXRlUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgcm91dGVySW50ZWdyYXRpb24sIHtcbiAgICAgIGFwaUtleVJlcXVpcmVkOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgY29uc3QgbG9nc1Jlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2xvZ3MnKTtcblxuICAgIC8vIExhbWJkYSBpbnRlZ3JhdGlvbiBmb3IgR0VUIHdpdGggQ09SUyBoZWFkZXJzXG4gICAgY29uc3QgbG9nc0ludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24obG9nc0ZuLCB7XG4gICAgICBwcm94eTogZmFsc2UsIC8vIE5vbi1wcm94eSB0byBjb250cm9sIHJlc3BvbnNlXG4gICAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW1xuICAgICAgICB7XG4gICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4gICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBcIicqJ1wiLFxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6XG4gICAgICAgICAgICAgIFwiJ0NvbnRlbnQtVHlwZSxYLUFtei1EYXRlLEF1dGhvcml6YXRpb24sWC1BcGktS2V5J1wiLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnNTAwJywgLy8gSGFuZGxlIGVycm9yc1xuICAgICAgICAgIHNlbGVjdGlvblBhdHRlcm46ICc1XFxcXGR7Mn0nLFxuICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOlxuICAgICAgICAgICAgICBcIidDb250ZW50LVR5cGUsWC1BbXotRGF0ZSxBdXRob3JpemF0aW9uLFgtQXBpLUtleSdcIixcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIEdFVCBtZXRob2Qgd2l0aCBDT1JTIHJlc3BvbnNlXG4gICAgbG9nc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbG9nc0ludGVncmF0aW9uLCB7XG4gICAgICBhcGlLZXlSZXF1aXJlZDogZmFsc2UsXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnNTAwJyxcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIE9QVElPTlMgbWV0aG9kIGZvciBDT1JTIHByZWZsaWdodFxuICAgIGNvbnN0IG9wdGlvbnNJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5Lk1vY2tJbnRlZ3JhdGlvbih7XG4gICAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW1xuICAgICAgICB7XG4gICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4gICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBcIicqJ1wiLFxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6XG4gICAgICAgICAgICAgIFwiJ0NvbnRlbnQtVHlwZSxYLUFtei1EYXRlLEF1dGhvcml6YXRpb24sWC1BcGktS2V5J1wiLFxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6XG4gICAgICAgICAgICAgIFwiJ0dFVCxPUFRJT05TJ1wiLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogYXBpZ2F0ZXdheS5QYXNzdGhyb3VnaEJlaGF2aW9yLldIRU5fTk9fTUFUQ0gsXG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XG4gICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogJ3tcInN0YXR1c0NvZGVcIjogMjAwfScsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgbG9nc1Jlc291cmNlLmFkZE1ldGhvZCgnT1BUSU9OUycsIG9wdGlvbnNJbnRlZ3JhdGlvbiwge1xuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogdHJ1ZSxcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gUzMgQnVja2V0IGZvciBGcm9udGVuZFxuICAgIGNvbnN0IGZyb250ZW5kQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnRnJvbnRlbmRCdWNrZXQnLCB7XG4gICAgICB3ZWJzaXRlSW5kZXhEb2N1bWVudDogJ2luZGV4Lmh0bWwnLFxuICAgICAgd2Vic2l0ZUVycm9yRG9jdW1lbnQ6ICdpbmRleC5odG1sJyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgcHVibGljUmVhZEFjY2VzczogdHJ1ZSxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBuZXcgczMuQmxvY2tQdWJsaWNBY2Nlc3Moe1xuICAgICAgICBibG9ja1B1YmxpY0FjbHM6IGZhbHNlLFxuICAgICAgICBpZ25vcmVQdWJsaWNBY2xzOiBmYWxzZSxcbiAgICAgICAgYmxvY2tQdWJsaWNQb2xpY3k6IGZhbHNlLFxuICAgICAgICByZXN0cmljdFB1YmxpY0J1Y2tldHM6IGZhbHNlLFxuICAgICAgfSksXG4gICAgfSk7XG5cbiAgICBmcm9udGVuZEJ1Y2tldC5hZGRUb1Jlc291cmNlUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbJ3MzOkdldE9iamVjdCddLFxuICAgICAgICByZXNvdXJjZXM6IFtgJHtmcm9udGVuZEJ1Y2tldC5idWNrZXRBcm59LypgXSxcbiAgICAgICAgcHJpbmNpcGFsczogW25ldyBpYW0uQW55UHJpbmNpcGFsKCldLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gRGVmaW5lIHRoZSBsb2dzIGVuZHBvaW50XG4gICAgY29uc3QgbG9nc0VuZHBvaW50ID0gYCR7YXBpLnVybH1sb2dzYDtcblxuICAgIC8vIEluamVjdCB0aGUgZW5kcG9pbnQgdmlhIGNvbmZpZy5qc1xuICAgIGNvbnN0IGNvbmZpZ0pzQ29udGVudCA9IGBcbiAgICAgIHdpbmRvdy5MT0dTX0VORFBPSU5UID0gJHtKU09OLnN0cmluZ2lmeShsb2dzRW5kcG9pbnQpfTtcbiAgICBgO1xuXG4gICAgLy8gRGVwbG95IGZyb250ZW5kIGZyb20gL2Zyb250ZW5kLXVpL2Rpc3RcbiAgICBuZXcgczNkZXBsb3kuQnVja2V0RGVwbG95bWVudCh0aGlzLCAnRGVwbG95RnJvbnRlbmQnLCB7XG4gICAgICBzb3VyY2VzOiBbXG4gICAgICAgIHMzZGVwbG95LlNvdXJjZS5hc3NldChcbiAgICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnZnJvbnRlbmQtdWknLCAnZGlzdCcpXG4gICAgICAgICksIC8vIFVwZGF0ZWQgcGF0aFxuICAgICAgICBzM2RlcGxveS5Tb3VyY2UuZGF0YSgnY29uZmlnLmpzJywgY29uZmlnSnNDb250ZW50KSxcbiAgICAgIF0sXG4gICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogZnJvbnRlbmRCdWNrZXQsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==