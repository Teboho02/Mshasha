#!/usr/bin/env bash
# Build the frontend, bundle the app, upload it and Backend/.env to S3 and (if the web stack exists) redeploy the server.
# Usage: infra/deploy.sh            build + upload + redeploy
#        infra/deploy.sh --upload-only
set -euo pipefail

REGION="${AWS_REGION:-af-south-1}"
BUCKET="${S3_BUCKET:-mshasha}"
BUNDLE_KEY="${BUNDLE_KEY:-deploy/mshasha.tar.gz}"
ENV_KEY="${ENV_KEY:-deploy/backend.env}"
WEB_STACK="${WEB_STACK:-mshasha-web}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLE="$(mktemp -d)/mshasha.tar.gz"
ENV_FILE="$ROOT/Backend/.env"

# The server refuses to start without these, so fail before uploading anything
for key in SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY ADMIN_PASSWORD_HASH SESSION_SECRET; do
  if ! grep -qE "^$key=.+" "$ENV_FILE"; then
    echo "Backend/.env is missing $key (run: cd Backend && npm run hash-password)" >&2
    exit 1
  fi
done

echo "Building frontend..."
(cd "$ROOT/MshashaZwinepe" && npm ci --no-audit --no-fund && npm run build)

echo "Creating bundle..."
# Only what the server needs: never node_modules or .env
tar -czf "$BUNDLE" -C "$ROOT" \
  Backend/server.js \
  Backend/package.json \
  Backend/package-lock.json \
  Backend/src \
  Backend/scripts \
  MshashaZwinepe/dist

echo "Uploading to s3://$BUCKET/$BUNDLE_KEY ..."
aws s3 cp "$BUNDLE" "s3://$BUCKET/$BUNDLE_KEY" --region "$REGION" --only-show-errors
rm -f "$BUNDLE"

echo "Uploading Backend/.env to s3://$BUCKET/$ENV_KEY (private) ..."
aws s3 cp "$ENV_FILE" "s3://$BUCKET/$ENV_KEY" --region "$REGION" --only-show-errors --sse AES256

if [ "${1:-}" = "--upload-only" ]; then
  echo "Uploaded. Skipping redeploy."
  exit 0
fi

INSTANCE_ID="$(aws cloudformation describe-stacks --region "$REGION" --stack-name "$WEB_STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='InstanceId'].OutputValue" --output text 2>/dev/null || true)"

if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" = "None" ]; then
  echo "Stack $WEB_STACK not found - bundle uploaded; the instance deploys it on first boot."
  exit 0
fi

echo "Redeploying on $INSTANCE_ID ..."
COMMAND_ID="$(aws ssm send-command --region "$REGION" --instance-ids "$INSTANCE_ID" \
  --document-name AWS-RunShellScript --comment "mshasha deploy" \
  --parameters 'commands=["/usr/local/bin/mshasha-deploy"]' \
  --query Command.CommandId --output text)"

aws ssm wait command-executed --region "$REGION" --command-id "$COMMAND_ID" --instance-id "$INSTANCE_ID" || true
aws ssm get-command-invocation --region "$REGION" --command-id "$COMMAND_ID" --instance-id "$INSTANCE_ID" \
  --query "[Status, StandardOutputContent, StandardErrorContent]" --output text
