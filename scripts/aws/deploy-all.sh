#!/usr/bin/env bash
# Sequential full deploy: CloudFormation stack first, then Docker build → ECR push → ECS rolling restart.
# Same env requirements as deploy-infra.sh + deploy-app.sh.
#
# Usage:
#   export CDK_DEFAULT_ACCOUNT=... CDK_DEFAULT_REGION=...
#   ./scripts/aws/deploy-all.sh
#   ./scripts/aws/deploy-all.sh -c production=true   # extra args go to cdk deploy

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"${SCRIPT_DIR}/deploy-infra.sh" "$@"
"${SCRIPT_DIR}/deploy-app.sh"
