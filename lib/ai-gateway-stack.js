"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiGatewayStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
class AiGatewayStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // S3 bucket for logs
        const logBucket = new aws_cdk_lib_1.aws_s3.Bucket(this, 'LLMLogBucket', {
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            lifecycleRules: [{ expiration: aws_cdk_lib_1.Duration.days(90) }],
        });
        // Single DynamoDB table
        const aiGatewayLogsTable = new aws_cdk_lib_1.aws_dynamodb.Table(this, 'AiGatewayLogsTable', {
            tableName: 'ai-gateway-logs-table',
            partitionKey: { name: 'PK', type: aws_cdk_lib_1.aws_dynamodb.AttributeType.STRING },
            sortKey: { name: 'SK', type: aws_cdk_lib_1.aws_dynamodb.AttributeType.STRING },
            billingMode: aws_cdk_lib_1.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        // Secrets Manager
        const llmApiKeys = new aws_cdk_lib_1.aws_secretsmanager.Secret(this, 'LLMProviderKeys', {
            secretName: 'llm-provider-api-keys',
            secretObjectValue: {
                ANTHROPIC_API_KEY: aws_cdk_lib_1.SecretValue.unsafePlainText('your-api-key'),
                GEMINI_API_KEY: aws_cdk_lib_1.SecretValue.unsafePlainText('your-api-key'),
                OPENAI_API_KEY: aws_cdk_lib_1.SecretValue.unsafePlainText('your-api-key'),
            },
        });
        // Athena setup
        const athenaWorkgroup = new aws_cdk_lib_1.aws_athena.CfnWorkGroup(this, 'AthenaWorkgroup', {
            name: 'llm_logs_workgroup',
            state: 'ENABLED',
            workGroupConfiguration: {
                resultConfiguration: {
                    outputLocation: `s3://${logBucket.bucketName}/athena-results/`,
                },
            },
        });
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
                            { Name: 'provider', Type: 'string' },
                            { Name: 'model', Type: 'string' },
                            { Name: 'tokens_used', Type: 'bigint' },
                            { Name: 'cost', Type: 'double' },
                            { Name: 'raw_request', Type: 'string' },
                            { Name: 'raw_response', Type: 'string' },
                            { Name: 'error_message', Type: 'string' },
                            { Name: 'status', Type: 'string' },
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
        // Router Lambda function (for /route)
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
                SYSTEM_PROMPT: 'You are a helpful assistant. You answer in cockney.',
                LOG_BUCKET_NAME: logBucket.bucketName,
            },
        });
        // Logs Lambda function (for /logs)
        const logsFn = new aws_cdk_lib_1.aws_lambda_nodejs.NodejsFunction(this, 'LogsFunction', {
            entry: 'lambda/logs.ts',
            handler: 'handler',
            runtime: aws_cdk_lib_1.aws_lambda.Runtime.NODEJS_18_X,
            timeout: aws_cdk_lib_1.Duration.minutes(3), // Increased for Athena queries (data + count)
            bundling: {
                format: aws_cdk_lib_1.aws_lambda_nodejs.OutputFormat.CJS,
                externalModules: ['aws-sdk'],
            },
            environment: {
                LOG_TABLE_NAME: aiGatewayLogsTable.tableName,
                LOG_BUCKET_NAME: logBucket.bucketName,
            },
        });
        // API Gateway logging setup
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
        aiGatewayLogsTable.grantReadWriteData(routerFn);
        llmApiKeys.grantRead(routerFn);
        logBucket.grantReadWrite(routerFn);
        aiGatewayLogsTable.grantReadData(logsFn); // Read-only for logs Lambda
        logBucket.grantRead(logsFn); // Read-only for logs Lambda
        logsFn.addToRolePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            actions: [
                'athena:StartQueryExecution',
                'athena:GetQueryExecution',
                'athena:GetQueryResults',
                's3:GetObject',
                's3:ListBucket',
                'glue:GetTable',
                'glue:GetDatabase',
            ],
            resources: [
                `arn:aws:athena:${this.region}:${this.account}:workgroup/${athenaWorkgroup.name}`,
                `arn:aws:glue:${this.region}:${this.account}:database/${athenaDatabase.node.id}`,
                `arn:aws:glue:${this.region}:${this.account}:table/${athenaDatabase.node.id}/*`,
                `arn:aws:s3:::${logBucket.bucketName}`,
                `arn:aws:s3:::${logBucket.bucketName}/*`,
            ],
        }));
        // API route for /route
        const routerIntegration = new aws_cdk_lib_1.aws_apigateway.LambdaIntegration(routerFn);
        const routeResource = api.root.addResource('route');
        routeResource.addMethod('POST', routerIntegration, {
            apiKeyRequired: true,
        });
        // API route for /logs (no API key required)
        const logsIntegration = new aws_cdk_lib_1.aws_apigateway.LambdaIntegration(logsFn);
        const logsResource = api.root.addResource('logs');
        logsResource.addMethod('GET', logsIntegration, {
            apiKeyRequired: false, // No x_secret_key required
        });
    }
}
exports.AiGatewayStack = AiGatewayStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWktZ2F0ZXdheS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFpLWdhdGV3YXktc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNkNBZ0JxQjtBQUVyQixNQUFhLGNBQWUsU0FBUSxtQkFBSztJQUN2QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWtCO1FBQzFELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLHFCQUFxQjtRQUNyQixNQUFNLFNBQVMsR0FBRyxJQUFJLG9CQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDcEQsYUFBYSxFQUFFLDJCQUFhLENBQUMsT0FBTztZQUNwQyxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGNBQWMsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7U0FDcEQsQ0FBQyxDQUFDO1FBRUgsd0JBQXdCO1FBQ3hCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSwwQkFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDeEUsU0FBUyxFQUFFLHVCQUF1QjtZQUNsQyxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSwwQkFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDakUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsMEJBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQzVELFdBQVcsRUFBRSwwQkFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELGFBQWEsRUFBRSwyQkFBYSxDQUFDLE9BQU87U0FDckMsQ0FBQyxDQUFDO1FBRUgsa0JBQWtCO1FBQ2xCLE1BQU0sVUFBVSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQ3BFLFVBQVUsRUFBRSx1QkFBdUI7WUFDbkMsaUJBQWlCLEVBQUU7Z0JBQ2pCLGlCQUFpQixFQUFFLHlCQUFXLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQztnQkFDOUQsY0FBYyxFQUFFLHlCQUFXLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQztnQkFDM0QsY0FBYyxFQUFFLHlCQUFXLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQzthQUM1RDtTQUNGLENBQUMsQ0FBQztRQUVILGVBQWU7UUFDZixNQUFNLGVBQWUsR0FBRyxJQUFJLHdCQUFNLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUN2RSxJQUFJLEVBQUUsb0JBQW9CO1lBQzFCLEtBQUssRUFBRSxTQUFTO1lBQ2hCLHNCQUFzQixFQUFFO2dCQUN0QixtQkFBbUIsRUFBRTtvQkFDbkIsY0FBYyxFQUFFLFFBQVEsU0FBUyxDQUFDLFVBQVUsa0JBQWtCO2lCQUMvRDthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxjQUFjLEdBQUcsSUFBSSx5QkFBVyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUM3RCxJQUFJLEVBQUUscUJBQXFCO1lBQzNCLFVBQVUsRUFBRTtnQkFDVixTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU87Z0JBQ3ZCLGFBQWEsRUFBRTtvQkFDYixJQUFJLEVBQUUsb0JBQW9CO29CQUMxQixXQUFXLEVBQUUsOEJBQThCO2lCQUM1QzthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxXQUFXLEdBQUcsSUFBSSx5QkFBVyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUM5RCxJQUFJLEVBQUUsa0JBQWtCO1lBQ3hCLFVBQVUsRUFBRTtnQkFDVixTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU87Z0JBQ3ZCLFlBQVksRUFBRSxvQkFBb0I7Z0JBQ2xDLFVBQVUsRUFBRTtvQkFDVixJQUFJLEVBQUUsaUJBQWlCO29CQUN2QixTQUFTLEVBQUUsZ0JBQWdCO29CQUMzQixVQUFVLEVBQUU7d0JBQ1Ysb0JBQW9CLEVBQUUsTUFBTTt3QkFDNUIsd0JBQXdCLEVBQUUsTUFBTTt3QkFDaEMsMEJBQTBCLEVBQUUsaUJBQWlCO3dCQUM3QyxzQkFBc0IsRUFBRSxNQUFNO3dCQUM5Qix1QkFBdUIsRUFBRSxnQkFBZ0I7d0JBQ3pDLHdCQUF3QixFQUFFLFlBQVk7d0JBQ3RDLDBCQUEwQixFQUFFLEdBQUc7d0JBQy9CLCtCQUErQixFQUFFLE1BQU07d0JBQ3ZDLDBCQUEwQixFQUFFLE1BQU07d0JBQ2xDLDRCQUE0QixFQUFFLGlDQUFpQzt3QkFDL0QsdUJBQXVCLEVBQUUsTUFBTTt3QkFDL0IseUJBQXlCLEVBQ3ZCLG1FQUFtRTt3QkFDckUsMkJBQTJCLEVBQUUsUUFBUSxTQUFTLENBQUMsVUFBVSxzRkFBc0Y7cUJBQ2hKO29CQUNELGlCQUFpQixFQUFFO3dCQUNqQixPQUFPLEVBQUU7NEJBQ1AsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7NEJBQzlCLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFOzRCQUNyQyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTs0QkFDckMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7NEJBQ25DLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFOzRCQUNwQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTs0QkFDakMsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7NEJBQ3ZDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFOzRCQUNoQyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTs0QkFDdkMsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7NEJBQ3hDLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFOzRCQUN6QyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTt5QkFDbkM7d0JBQ0QsUUFBUSxFQUFFLFFBQVEsU0FBUyxDQUFDLFVBQVUsZ0JBQWdCO3dCQUN0RCxXQUFXLEVBQ1QsK0RBQStEO3dCQUNqRSxZQUFZLEVBQ1YsZ0VBQWdFO3dCQUNsRSxTQUFTLEVBQUU7NEJBQ1Qsb0JBQW9CLEVBQ2xCLDZEQUE2RDt5QkFDaEU7cUJBQ0Y7b0JBQ0QsYUFBYSxFQUFFO3dCQUNiLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO3dCQUNsQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTt3QkFDaEMsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7d0JBQ3BDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO3FCQUNsQztpQkFDRjthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsV0FBVyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMxQyxjQUFjLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzlDLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxxQkFBRyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztRQUV0RSxzQ0FBc0M7UUFDdEMsTUFBTSxRQUFRLEdBQUcsSUFBSSwrQkFBVSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDckUsS0FBSyxFQUFFLGtCQUFrQjtZQUN6QixPQUFPLEVBQUUsU0FBUztZQUNsQixPQUFPLEVBQUUsd0JBQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsc0JBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzdCLFFBQVEsRUFBRTtnQkFDUixNQUFNLEVBQUUsK0JBQVUsQ0FBQyxZQUFZLENBQUMsR0FBRztnQkFDbkMsZUFBZSxFQUFFLENBQUMsU0FBUyxDQUFDO2dCQUM1QixXQUFXLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQzthQUNuQztZQUNELFdBQVcsRUFBRTtnQkFDWCxjQUFjLEVBQUUsa0JBQWtCLENBQUMsU0FBUztnQkFDNUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxVQUFVO2dCQUNsQyxhQUFhLEVBQUUscURBQXFEO2dCQUNwRSxlQUFlLEVBQUUsU0FBUyxDQUFDLFVBQVU7YUFDdEM7U0FDRixDQUFDLENBQUM7UUFFSCxtQ0FBbUM7UUFDbkMsTUFBTSxNQUFNLEdBQUcsSUFBSSwrQkFBVSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ2pFLEtBQUssRUFBRSxnQkFBZ0I7WUFDdkIsT0FBTyxFQUFFLFNBQVM7WUFDbEIsT0FBTyxFQUFFLHdCQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLHNCQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLDhDQUE4QztZQUM1RSxRQUFRLEVBQUU7Z0JBQ1IsTUFBTSxFQUFFLCtCQUFVLENBQUMsWUFBWSxDQUFDLEdBQUc7Z0JBQ25DLGVBQWUsRUFBRSxDQUFDLFNBQVMsQ0FBQzthQUM3QjtZQUNELFdBQVcsRUFBRTtnQkFDWCxjQUFjLEVBQUUsa0JBQWtCLENBQUMsU0FBUztnQkFDNUMsZUFBZSxFQUFFLFNBQVMsQ0FBQyxVQUFVO2FBQ3RDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsNEJBQTRCO1FBQzVCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxxQkFBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsMEJBQTBCLEVBQUU7WUFDdkUsU0FBUyxFQUFFLElBQUkscUJBQUcsQ0FBQyxnQkFBZ0IsQ0FBQywwQkFBMEIsQ0FBQztZQUMvRCxlQUFlLEVBQUU7Z0JBQ2YscUJBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQ3hDLG1EQUFtRCxDQUNwRDthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsSUFBSSxzQkFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDNUQsWUFBWSxFQUFFLG1CQUFtQixFQUFFLGNBQWM7WUFDakQsU0FBUyxFQUFFLHNCQUFJLENBQUMsYUFBYSxDQUFDLFdBQVc7WUFDekMsYUFBYSxFQUFFLDJCQUFhLENBQUMsT0FBTztTQUNyQyxDQUFDLENBQUM7UUFFSCxNQUFNLEdBQUcsR0FBRyxJQUFJLDRCQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMzRCxXQUFXLEVBQUUsZ0JBQWdCO1lBQzdCLFdBQVcsRUFBRSxpREFBaUQ7WUFDOUQsZ0JBQWdCLEVBQUUsNEJBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNO1lBQ3BELGFBQWEsRUFBRTtnQkFDYixTQUFTLEVBQUUsS0FBSztnQkFDaEIsWUFBWSxFQUFFLDRCQUFVLENBQUMsa0JBQWtCLENBQUMsSUFBSTtnQkFDaEQsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLG9CQUFvQixFQUFFLElBQUksNEJBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUM7Z0JBQ3JFLGVBQWUsRUFBRSw0QkFBVSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsRUFBRTthQUNyRTtTQUNGLENBQUMsQ0FBQztRQUVILE1BQU0sVUFBVSxHQUFHLElBQUksNEJBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ3RFLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDLE9BQU87U0FDN0MsQ0FBQyxDQUFDO1FBRUgsVUFBVSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNqRCxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVuQyxNQUFNLFVBQVUsR0FBRyxJQUFJLDRCQUFVLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDM0QsVUFBVSxFQUFFLGlCQUFpQjtZQUM3QixPQUFPLEVBQUUsSUFBSTtTQUNkLENBQUMsQ0FBQztRQUVILE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUU7WUFDbkQsSUFBSSxFQUFFLGdCQUFnQjtZQUN0QixRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUU7U0FDNUMsQ0FBQyxDQUFDO1FBRUgsU0FBUyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNoQyxTQUFTLENBQUMsV0FBVyxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBRXRELGNBQWM7UUFDZCxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNoRCxVQUFVLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQy9CLFNBQVMsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFbkMsa0JBQWtCLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsNEJBQTRCO1FBQ3RFLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyw0QkFBNEI7UUFDekQsTUFBTSxDQUFDLGVBQWUsQ0FDcEIsSUFBSSxxQkFBRyxDQUFDLGVBQWUsQ0FBQztZQUN0QixPQUFPLEVBQUU7Z0JBQ1AsNEJBQTRCO2dCQUM1QiwwQkFBMEI7Z0JBQzFCLHdCQUF3QjtnQkFDeEIsY0FBYztnQkFDZCxlQUFlO2dCQUNmLGVBQWU7Z0JBQ2Ysa0JBQWtCO2FBQ25CO1lBQ0QsU0FBUyxFQUFFO2dCQUNULGtCQUFrQixJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLGNBQWMsZUFBZSxDQUFDLElBQUksRUFBRTtnQkFDakYsZ0JBQWdCLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sYUFBYSxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRTtnQkFDaEYsZ0JBQWdCLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sVUFBVSxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSTtnQkFDL0UsZ0JBQWdCLFNBQVMsQ0FBQyxVQUFVLEVBQUU7Z0JBQ3RDLGdCQUFnQixTQUFTLENBQUMsVUFBVSxJQUFJO2FBQ3pDO1NBQ0YsQ0FBQyxDQUNILENBQUM7UUFFRix1QkFBdUI7UUFDdkIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLDRCQUFVLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDckUsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEQsYUFBYSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLEVBQUU7WUFDakQsY0FBYyxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFDO1FBRUgsNENBQTRDO1FBQzVDLE1BQU0sZUFBZSxHQUFHLElBQUksNEJBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNqRSxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRCxZQUFZLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUU7WUFDN0MsY0FBYyxFQUFFLEtBQUssRUFBRSwyQkFBMkI7U0FDbkQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBbFBELHdDQWtQQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHtcbiAgYXdzX2xhbWJkYSBhcyBsYW1iZGEsXG4gIGF3c19sYW1iZGFfbm9kZWpzIGFzIGxhbWJkYU5vZGUsXG4gIGF3c19hcGlnYXRld2F5IGFzIGFwaWdhdGV3YXksXG4gIGF3c19zZWNyZXRzbWFuYWdlciBhcyBzZWNyZXRzbWFuYWdlcixcbiAgYXdzX2R5bmFtb2RiIGFzIGR5bmFtb2RiLFxuICBhd3NfaWFtIGFzIGlhbSxcbiAgYXdzX2xvZ3MgYXMgbG9ncyxcbiAgYXdzX3MzIGFzIHMzLFxuICBhd3NfYXRoZW5hIGFzIGF0aGVuYSxcbiAgQ2ZuUmVzb3VyY2UsXG4gIFN0YWNrLFxuICBTdGFja1Byb3BzLFxuICBEdXJhdGlvbixcbiAgUmVtb3ZhbFBvbGljeSxcbiAgU2VjcmV0VmFsdWUsXG59IGZyb20gJ2F3cy1jZGstbGliJztcblxuZXhwb3J0IGNsYXNzIEFpR2F0ZXdheVN0YWNrIGV4dGVuZHMgU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIFMzIGJ1Y2tldCBmb3IgbG9nc1xuICAgIGNvbnN0IGxvZ0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0xMTUxvZ0J1Y2tldCcsIHtcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IFt7IGV4cGlyYXRpb246IER1cmF0aW9uLmRheXMoOTApIH1dLFxuICAgIH0pO1xuXG4gICAgLy8gU2luZ2xlIER5bmFtb0RCIHRhYmxlXG4gICAgY29uc3QgYWlHYXRld2F5TG9nc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdBaUdhdGV3YXlMb2dzVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6ICdhaS1nYXRld2F5LWxvZ3MtdGFibGUnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdQSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdTSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gU2VjcmV0cyBNYW5hZ2VyXG4gICAgY29uc3QgbGxtQXBpS2V5cyA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ0xMTVByb3ZpZGVyS2V5cycsIHtcbiAgICAgIHNlY3JldE5hbWU6ICdsbG0tcHJvdmlkZXItYXBpLWtleXMnLFxuICAgICAgc2VjcmV0T2JqZWN0VmFsdWU6IHtcbiAgICAgICAgQU5USFJPUElDX0FQSV9LRVk6IFNlY3JldFZhbHVlLnVuc2FmZVBsYWluVGV4dCgneW91ci1hcGkta2V5JyksXG4gICAgICAgIEdFTUlOSV9BUElfS0VZOiBTZWNyZXRWYWx1ZS51bnNhZmVQbGFpblRleHQoJ3lvdXItYXBpLWtleScpLFxuICAgICAgICBPUEVOQUlfQVBJX0tFWTogU2VjcmV0VmFsdWUudW5zYWZlUGxhaW5UZXh0KCd5b3VyLWFwaS1rZXknKSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBBdGhlbmEgc2V0dXBcbiAgICBjb25zdCBhdGhlbmFXb3JrZ3JvdXAgPSBuZXcgYXRoZW5hLkNmbldvcmtHcm91cCh0aGlzLCAnQXRoZW5hV29ya2dyb3VwJywge1xuICAgICAgbmFtZTogJ2xsbV9sb2dzX3dvcmtncm91cCcsXG4gICAgICBzdGF0ZTogJ0VOQUJMRUQnLFxuICAgICAgd29ya0dyb3VwQ29uZmlndXJhdGlvbjoge1xuICAgICAgICByZXN1bHRDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgb3V0cHV0TG9jYXRpb246IGBzMzovLyR7bG9nQnVja2V0LmJ1Y2tldE5hbWV9L2F0aGVuYS1yZXN1bHRzL2AsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgYXRoZW5hRGF0YWJhc2UgPSBuZXcgQ2ZuUmVzb3VyY2UodGhpcywgJ0F0aGVuYURhdGFiYXNlJywge1xuICAgICAgdHlwZTogJ0FXUzo6R2x1ZTo6RGF0YWJhc2UnLFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBDYXRhbG9nSWQ6IHRoaXMuYWNjb3VudCxcbiAgICAgICAgRGF0YWJhc2VJbnB1dDoge1xuICAgICAgICAgIE5hbWU6ICdhaV9nYXRld2F5X2xvZ3NfZGInLFxuICAgICAgICAgIERlc2NyaXB0aW9uOiAnRGF0YWJhc2UgZm9yIEFJIEdhdGV3YXkgbG9ncycsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgYXRoZW5hVGFibGUgPSBuZXcgQ2ZuUmVzb3VyY2UodGhpcywgJ0FJR2F0ZXdheUxvZ3NUYWJsZScsIHtcbiAgICAgIHR5cGU6ICdBV1M6OkdsdWU6OlRhYmxlJyxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgQ2F0YWxvZ0lkOiB0aGlzLmFjY291bnQsXG4gICAgICAgIERhdGFiYXNlTmFtZTogJ2FpX2dhdGV3YXlfbG9nc19kYicsXG4gICAgICAgIFRhYmxlSW5wdXQ6IHtcbiAgICAgICAgICBOYW1lOiAnYWlfZ2F0ZXdheV9sb2dzJyxcbiAgICAgICAgICBUYWJsZVR5cGU6ICdFWFRFUk5BTF9UQUJMRScsXG4gICAgICAgICAgUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgJ3Byb2plY3Rpb24uZW5hYmxlZCc6ICd0cnVlJyxcbiAgICAgICAgICAgICdwcm9qZWN0aW9uLnN0YXR1cy50eXBlJzogJ2VudW0nLFxuICAgICAgICAgICAgJ3Byb2plY3Rpb24uc3RhdHVzLnZhbHVlcyc6ICdzdWNjZXNzLGZhaWx1cmUnLFxuICAgICAgICAgICAgJ3Byb2plY3Rpb24uZGF0ZS50eXBlJzogJ2RhdGUnLFxuICAgICAgICAgICAgJ3Byb2plY3Rpb24uZGF0ZS5yYW5nZSc6ICcyMDI1LTAxLTAxLE5PVycsXG4gICAgICAgICAgICAncHJvamVjdGlvbi5kYXRlLmZvcm1hdCc6ICd5eXl5LU1NLWRkJyxcbiAgICAgICAgICAgICdwcm9qZWN0aW9uLmRhdGUuaW50ZXJ2YWwnOiAnMScsXG4gICAgICAgICAgICAncHJvamVjdGlvbi5kYXRlLmludGVydmFsLnVuaXQnOiAnREFZUycsXG4gICAgICAgICAgICAncHJvamVjdGlvbi5wcm92aWRlci50eXBlJzogJ2VudW0nLFxuICAgICAgICAgICAgJ3Byb2plY3Rpb24ucHJvdmlkZXIudmFsdWVzJzogJ29wZW5haSxhbnRocm9waWMsZ2VtaW5pLHVua25vd24nLFxuICAgICAgICAgICAgJ3Byb2plY3Rpb24ubW9kZWwudHlwZSc6ICdlbnVtJyxcbiAgICAgICAgICAgICdwcm9qZWN0aW9uLm1vZGVsLnZhbHVlcyc6XG4gICAgICAgICAgICAgICdncHQtMy41LXR1cmJvLGdwdC00LGNsYXVkZS0zLW9wdXMtMjAyNDAyMjksZ2VtaW5pLTEuNS1wcm8sdW5rbm93bicsXG4gICAgICAgICAgICAnc3RvcmFnZS5sb2NhdGlvbi50ZW1wbGF0ZSc6IGBzMzovLyR7bG9nQnVja2V0LmJ1Y2tldE5hbWV9L2xvZ3MvcGFycXVldC9zdGF0dXM9XFwke3N0YXR1c30vZGF0ZT1cXCR7ZGF0ZX0vcHJvdmlkZXI9XFwke3Byb3ZpZGVyfS9tb2RlbD1cXCR7bW9kZWx9L2AsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBTdG9yYWdlRGVzY3JpcHRvcjoge1xuICAgICAgICAgICAgQ29sdW1uczogW1xuICAgICAgICAgICAgICB7IE5hbWU6ICdpZCcsIFR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgIHsgTmFtZTogJ3RocmVhZF90cycsIFR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgIHsgTmFtZTogJ3RpbWVzdGFtcCcsIFR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgIHsgTmFtZTogJ2xhdGVuY3knLCBUeXBlOiAnYmlnaW50JyB9LFxuICAgICAgICAgICAgICB7IE5hbWU6ICdwcm92aWRlcicsIFR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgIHsgTmFtZTogJ21vZGVsJywgVHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgeyBOYW1lOiAndG9rZW5zX3VzZWQnLCBUeXBlOiAnYmlnaW50JyB9LFxuICAgICAgICAgICAgICB7IE5hbWU6ICdjb3N0JywgVHlwZTogJ2RvdWJsZScgfSxcbiAgICAgICAgICAgICAgeyBOYW1lOiAncmF3X3JlcXVlc3QnLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICB7IE5hbWU6ICdyYXdfcmVzcG9uc2UnLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICB7IE5hbWU6ICdlcnJvcl9tZXNzYWdlJywgVHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgeyBOYW1lOiAnc3RhdHVzJywgVHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBMb2NhdGlvbjogYHMzOi8vJHtsb2dCdWNrZXQuYnVja2V0TmFtZX0vbG9ncy9wYXJxdWV0L2AsXG4gICAgICAgICAgICBJbnB1dEZvcm1hdDpcbiAgICAgICAgICAgICAgJ29yZy5hcGFjaGUuaGFkb29wLmhpdmUucWwuaW8ucGFycXVldC5NYXByZWRQYXJxdWV0SW5wdXRGb3JtYXQnLFxuICAgICAgICAgICAgT3V0cHV0Rm9ybWF0OlxuICAgICAgICAgICAgICAnb3JnLmFwYWNoZS5oYWRvb3AuaGl2ZS5xbC5pby5wYXJxdWV0Lk1hcHJlZFBhcnF1ZXRPdXRwdXRGb3JtYXQnLFxuICAgICAgICAgICAgU2VyZGVJbmZvOiB7XG4gICAgICAgICAgICAgIFNlcmlhbGl6YXRpb25MaWJyYXJ5OlxuICAgICAgICAgICAgICAgICdvcmcuYXBhY2hlLmhhZG9vcC5oaXZlLnFsLmlvLnBhcnF1ZXQuc2VyZGUuUGFycXVldEhpdmVTZXJEZScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgUGFydGl0aW9uS2V5czogW1xuICAgICAgICAgICAgeyBOYW1lOiAnc3RhdHVzJywgVHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgIHsgTmFtZTogJ2RhdGUnLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgeyBOYW1lOiAncHJvdmlkZXInLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgeyBOYW1lOiAnbW9kZWwnLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgYXRoZW5hVGFibGUuYWRkRGVwZW5kZW5jeShhdGhlbmFEYXRhYmFzZSk7XG4gICAgYXRoZW5hRGF0YWJhc2UuYWRkRGVwZW5kZW5jeShhdGhlbmFXb3JrZ3JvdXApO1xuICAgIGxvZ0J1Y2tldC5ncmFudFJlYWQobmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdhdGhlbmEuYW1hem9uYXdzLmNvbScpKTtcblxuICAgIC8vIFJvdXRlciBMYW1iZGEgZnVuY3Rpb24gKGZvciAvcm91dGUpXG4gICAgY29uc3Qgcm91dGVyRm4gPSBuZXcgbGFtYmRhTm9kZS5Ob2RlanNGdW5jdGlvbih0aGlzLCAnUm91dGVyRnVuY3Rpb24nLCB7XG4gICAgICBlbnRyeTogJ2xhbWJkYS9yb3V0ZXIudHMnLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICB0aW1lb3V0OiBEdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgIGZvcm1hdDogbGFtYmRhTm9kZS5PdXRwdXRGb3JtYXQuQ0pTLFxuICAgICAgICBleHRlcm5hbE1vZHVsZXM6IFsnYXdzLXNkayddLFxuICAgICAgICBub2RlTW9kdWxlczogWydAc21pdGh5L3V0aWwtdXRmOCddLFxuICAgICAgfSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIExPR19UQUJMRV9OQU1FOiBhaUdhdGV3YXlMb2dzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBTRUNSRVRfTkFNRTogbGxtQXBpS2V5cy5zZWNyZXROYW1lLFxuICAgICAgICBTWVNURU1fUFJPTVBUOiAnWW91IGFyZSBhIGhlbHBmdWwgYXNzaXN0YW50LiBZb3UgYW5zd2VyIGluIGNvY2tuZXkuJyxcbiAgICAgICAgTE9HX0JVQ0tFVF9OQU1FOiBsb2dCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBMb2dzIExhbWJkYSBmdW5jdGlvbiAoZm9yIC9sb2dzKVxuICAgIGNvbnN0IGxvZ3NGbiA9IG5ldyBsYW1iZGFOb2RlLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdMb2dzRnVuY3Rpb24nLCB7XG4gICAgICBlbnRyeTogJ2xhbWJkYS9sb2dzLnRzJyxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgdGltZW91dDogRHVyYXRpb24ubWludXRlcygzKSwgLy8gSW5jcmVhc2VkIGZvciBBdGhlbmEgcXVlcmllcyAoZGF0YSArIGNvdW50KVxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgZm9ybWF0OiBsYW1iZGFOb2RlLk91dHB1dEZvcm1hdC5DSlMsXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydhd3Mtc2RrJ10sXG4gICAgICB9LFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgTE9HX1RBQkxFX05BTUU6IGFpR2F0ZXdheUxvZ3NUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIExPR19CVUNLRVRfTkFNRTogbG9nQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQVBJIEdhdGV3YXkgbG9nZ2luZyBzZXR1cFxuICAgIGNvbnN0IGFwaUdhdGV3YXlMb2dSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdBcGlHYXRld2F5Q2xvdWRXYXRjaFJvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnYXBpZ2F0ZXdheS5hbWF6b25hd3MuY29tJyksXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFxuICAgICAgICAgICdzZXJ2aWNlLXJvbGUvQW1hem9uQVBJR2F0ZXdheVB1c2hUb0Nsb3VkV2F0Y2hMb2dzJ1xuICAgICAgICApLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0dhdGV3YXlBY2Nlc3NMb2dzJywge1xuICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9hcGlnYXRld2F5LyR7aWR9L2FjY2Vzcy1sb2dzYCxcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLkZPVVJfTU9OVEhTLFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnQWlHYXRld2F5UmVzdEFwaScsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiAnQUkgR2F0ZXdheSBBUEknLFxuICAgICAgZGVzY3JpcHRpb246ICdSb3V0ZXMgcmVxdWVzdHMgdG8gdGhlIGFwcHJvcHJpYXRlIExMTSBzZXJ2aWNlLicsXG4gICAgICBhcGlLZXlTb3VyY2VUeXBlOiBhcGlnYXRld2F5LkFwaUtleVNvdXJjZVR5cGUuSEVBREVSLFxuICAgICAgZGVwbG95T3B0aW9uczoge1xuICAgICAgICBzdGFnZU5hbWU6ICdkZXYnLFxuICAgICAgICBsb2dnaW5nTGV2ZWw6IGFwaWdhdGV3YXkuTWV0aG9kTG9nZ2luZ0xldmVsLklORk8sXG4gICAgICAgIGRhdGFUcmFjZUVuYWJsZWQ6IHRydWUsXG4gICAgICAgIG1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICBhY2Nlc3NMb2dEZXN0aW5hdGlvbjogbmV3IGFwaWdhdGV3YXkuTG9nR3JvdXBMb2dEZXN0aW5hdGlvbihsb2dHcm91cCksXG4gICAgICAgIGFjY2Vzc0xvZ0Zvcm1hdDogYXBpZ2F0ZXdheS5BY2Nlc3NMb2dGb3JtYXQuanNvbldpdGhTdGFuZGFyZEZpZWxkcygpLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNmbkFjY291bnQgPSBuZXcgYXBpZ2F0ZXdheS5DZm5BY2NvdW50KHRoaXMsICdBcGlHYXRld2F5QWNjb3VudCcsIHtcbiAgICAgIGNsb3VkV2F0Y2hSb2xlQXJuOiBhcGlHYXRld2F5TG9nUm9sZS5yb2xlQXJuLFxuICAgIH0pO1xuXG4gICAgY2ZuQWNjb3VudC5ub2RlLmFkZERlcGVuZGVuY3koYXBpR2F0ZXdheUxvZ1JvbGUpO1xuICAgIGFwaS5ub2RlLmFkZERlcGVuZGVuY3koY2ZuQWNjb3VudCk7XG5cbiAgICBjb25zdCBnYXRld2F5S2V5ID0gbmV3IGFwaWdhdGV3YXkuQXBpS2V5KHRoaXMsICdHYXRld2F5S2V5Jywge1xuICAgICAgYXBpS2V5TmFtZTogJ2dhdGV3YXktYXBpLWtleScsXG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdXNhZ2VQbGFuID0gYXBpLmFkZFVzYWdlUGxhbignQmFzaWNVc2FnZVBsYW4nLCB7XG4gICAgICBuYW1lOiAnQmFzaWNVc2FnZVBsYW4nLFxuICAgICAgdGhyb3R0bGU6IHsgcmF0ZUxpbWl0OiAxMCwgYnVyc3RMaW1pdDogMjAgfSxcbiAgICB9KTtcblxuICAgIHVzYWdlUGxhbi5hZGRBcGlLZXkoZ2F0ZXdheUtleSk7XG4gICAgdXNhZ2VQbGFuLmFkZEFwaVN0YWdlKHsgc3RhZ2U6IGFwaS5kZXBsb3ltZW50U3RhZ2UgfSk7XG5cbiAgICAvLyBQZXJtaXNzaW9uc1xuICAgIGFpR2F0ZXdheUxvZ3NUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEocm91dGVyRm4pO1xuICAgIGxsbUFwaUtleXMuZ3JhbnRSZWFkKHJvdXRlckZuKTtcbiAgICBsb2dCdWNrZXQuZ3JhbnRSZWFkV3JpdGUocm91dGVyRm4pO1xuXG4gICAgYWlHYXRld2F5TG9nc1RhYmxlLmdyYW50UmVhZERhdGEobG9nc0ZuKTsgLy8gUmVhZC1vbmx5IGZvciBsb2dzIExhbWJkYVxuICAgIGxvZ0J1Y2tldC5ncmFudFJlYWQobG9nc0ZuKTsgLy8gUmVhZC1vbmx5IGZvciBsb2dzIExhbWJkYVxuICAgIGxvZ3NGbi5hZGRUb1JvbGVQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAnYXRoZW5hOlN0YXJ0UXVlcnlFeGVjdXRpb24nLFxuICAgICAgICAgICdhdGhlbmE6R2V0UXVlcnlFeGVjdXRpb24nLFxuICAgICAgICAgICdhdGhlbmE6R2V0UXVlcnlSZXN1bHRzJyxcbiAgICAgICAgICAnczM6R2V0T2JqZWN0JyxcbiAgICAgICAgICAnczM6TGlzdEJ1Y2tldCcsXG4gICAgICAgICAgJ2dsdWU6R2V0VGFibGUnLFxuICAgICAgICAgICdnbHVlOkdldERhdGFiYXNlJyxcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgYGFybjphd3M6YXRoZW5hOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTp3b3JrZ3JvdXAvJHthdGhlbmFXb3JrZ3JvdXAubmFtZX1gLFxuICAgICAgICAgIGBhcm46YXdzOmdsdWU6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OmRhdGFiYXNlLyR7YXRoZW5hRGF0YWJhc2Uubm9kZS5pZH1gLFxuICAgICAgICAgIGBhcm46YXdzOmdsdWU6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OnRhYmxlLyR7YXRoZW5hRGF0YWJhc2Uubm9kZS5pZH0vKmAsXG4gICAgICAgICAgYGFybjphd3M6czM6Ojoke2xvZ0J1Y2tldC5idWNrZXROYW1lfWAsXG4gICAgICAgICAgYGFybjphd3M6czM6Ojoke2xvZ0J1Y2tldC5idWNrZXROYW1lfS8qYCxcbiAgICAgICAgXSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vIEFQSSByb3V0ZSBmb3IgL3JvdXRlXG4gICAgY29uc3Qgcm91dGVySW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihyb3V0ZXJGbik7XG4gICAgY29uc3Qgcm91dGVSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdyb3V0ZScpO1xuICAgIHJvdXRlUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgcm91dGVySW50ZWdyYXRpb24sIHtcbiAgICAgIGFwaUtleVJlcXVpcmVkOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gQVBJIHJvdXRlIGZvciAvbG9ncyAobm8gQVBJIGtleSByZXF1aXJlZClcbiAgICBjb25zdCBsb2dzSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihsb2dzRm4pO1xuICAgIGNvbnN0IGxvZ3NSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdsb2dzJyk7XG4gICAgbG9nc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbG9nc0ludGVncmF0aW9uLCB7XG4gICAgICBhcGlLZXlSZXF1aXJlZDogZmFsc2UsIC8vIE5vIHhfc2VjcmV0X2tleSByZXF1aXJlZFxuICAgIH0pO1xuICB9XG59XG4iXX0=