import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dotenv from 'dotenv';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from 'aws-cdk-lib/aws-sqs';

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

    const routerFn = new lambdaNode.NodejsFunction(this, 'RouterFunction', {
      entry: 'lambda/router.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: Duration.seconds(30),
      environment: {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
        MESSAGE_TABLE_NAME: messageTable.tableName,
        SYSTEM_PROMPT: `You are a helpful assistant. You answer in cockney.`,
      }
    });

    const api = new apigateway.RestApi(this, 'AiGatewayRestApi', {
      restApiName: 'AI Gateway API',
      description: 'Routes requests to the appropriate LLM service.',
      deployOptions: {
        stageName: 'dev',
      },
    });

    const routerIntegration = new apigateway.LambdaIntegration(routerFn);
    const routeResource = api.root.addResource('route');
    routeResource.addMethod('POST', routerIntegration); 

    const openAISecret = new secretsmanager.Secret(this, 'OpenAISecret');

    metadataTable.grantReadData(routerFn);
    openAISecret.grantRead(routerFn);
    messageTable.grantReadWriteData(routerFn);
  }
}
