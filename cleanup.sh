#!/bin/bash

# Script to cleanly destroy all CDK stacks and associated AWS resources
# including Secrets Manager secrets

# === Stacks to destroy ===
STACKS=("AiGatewayStack")

# === Secret to delete ===
SECRET_NAME="llm-provider-api-keys"

# === Destroy CDK stacks ===
echo "🔁 Starting destruction of CDK stacks: ${STACKS[*]}"

for STACK in "${STACKS[@]}"; do
  echo "⛔ Destroying stack: $STACK..."
  npx cdk destroy "$STACK" --force
done

echo "✅ All specified CDK stacks destroyed."

# === Delete Secrets Manager secret (force delete, no recovery) ===
echo "⛔ Force deleting Secrets Manager secret: $SECRET_NAME"
aws secretsmanager delete-secret \
  --secret-id "$SECRET_NAME" \
  --force-delete-without-recovery

echo "✅ Secret '$SECRET_NAME' permanently deleted."

echo "🏁 Cleanup complete."
