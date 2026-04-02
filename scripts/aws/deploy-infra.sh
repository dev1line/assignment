#!/usr/bin/env bash
# Deploy / update the CloudFormation stack only (no Docker).
# Prerequisites: AWS CLI v2, Node/npm, CDK deps in infra/cdk; CDK bootstrap once per account+region.
#
# Required env:
#   CDK_DEFAULT_ACCOUNT   AWS account ID
#   CDK_DEFAULT_REGION    e.g. ap-southeast-1
#
# Optional:
#   Extra args are passed through to `cdk deploy` (e.g. -c production=true).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CDK_DIR="${ROOT_DIR}/infra/cdk"

if [[ -z "${CDK_DEFAULT_ACCOUNT:-}" ]]; then
  echo "error: set CDK_DEFAULT_ACCOUNT" >&2
  exit 1
fi
if [[ -z "${CDK_DEFAULT_REGION:-}" ]]; then
  echo "error: set CDK_DEFAULT_REGION (or rely on CDK env; region is required for this script)" >&2
  exit 1
fi

export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-$CDK_DEFAULT_REGION}"

cd "${CDK_DIR}"
if [[ ! -d node_modules ]]; then
  npm install
fi

echo ">>> CDK deploy (stack only; push image with deploy-app.sh or deploy-all.sh) ..."
npx cdk deploy --require-approval never "$@"

echo ">>> Stack finished. Next: ${ROOT_DIR}/scripts/aws/deploy-app.sh (or deploy-all.sh)"
