import {
  BedrockClient,
  GetFoundationModelCommand,
} from '@aws-sdk/client-bedrock';
import { CdkCustomResourceEvent, Context } from 'aws-lambda';

const bedrock = new BedrockClient({});

export const handler = async (
  event: CdkCustomResourceEvent,
  context: Context
) => {
  const { modelId } = event.ResourceProperties;

  if (event.RequestType === 'Delete') {
    return {
      PhysicalResourceId: `BedrockModelAccess-${modelId}`,
    };
  }

  try {
    // Try to get the model details - this will fail if we don't have access
    const command = new GetFoundationModelCommand({
      modelIdentifier: modelId,
    });

    await bedrock.send(command);

    return {
      PhysicalResourceId: `BedrockModelAccess-${modelId}`,
      Data: {
        Message: `Successfully verified access to Bedrock model ${modelId}`,
      },
    };
  } catch (error) {
    console.error('Error accessing Bedrock model:', error);
    throw error;
  }
};
