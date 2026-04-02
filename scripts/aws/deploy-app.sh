#!/usr/bin/env bash
# Rebuild the API Docker image and roll out ECS by running CDK deploy (container is a CDK asset).
# Requires Docker running locally (same as first-time cdk deploy).
#
# Required env:
#   CDK_DEFAULT_ACCOUNT   AWS account ID
#   CDK_DEFAULT_REGION    e.g. ap-southeast-1
#
# Optional: extra args are passed through to `cdk deploy`.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CDK_DIR="${ROOT_DIR}/infra/cdk"
STACK_NAME="${STACK_NAME:-TeacherStudentStack}"

if [[ -z "${CDK_DEFAULT_ACCOUNT:-}" ]]; then
  echo "error: set CDK_DEFAULT_ACCOUNT" >&2
  exit 1
fi
if [[ -z "${CDK_DEFAULT_REGION:-}" ]]; then
  echo "error: set CDK_DEFAULT_REGION" >&2
  exit 1
fi

export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-$CDK_DEFAULT_REGION}"

cd "${CDK_DIR}"
if [[ ! -d node_modules ]]; then
  npm install
fi

echo ">>> CDK deploy (rebuild Docker asset + ECS rollout) ..."
npx cdk deploy --require-approval never "$@"

API_URL="$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME:-TeacherStudentStack}" \
  --region "${AWS_DEFAULT_REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue | [0]" \
  --output text 2>/dev/null || true)"
if [[ -n "${API_URL}" && "${API_URL}" != "None" ]]; then
  echo ">>> Done. API: ${API_URL}"
fi
