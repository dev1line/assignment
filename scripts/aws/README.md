# AWS deploy scripts (ECR + ECS)

These scripts match the **app-owned ECR repository** created by [`TeacherStudentStack`](../../infra/cdk/lib/teacher-student-stack.ts): infrastructure first, then **build → push → ECS force deployment**.

## Prerequisites

- **AWS CLI v2** (`aws`) with credentials that can deploy CDK, push to ECR, and update ECS.
- **Docker** (for `deploy-app.sh` / `deploy-all.sh` only — not required for `deploy-infra.sh`).
- **Node.js + npm** for `infra/cdk`.
- **CDK bootstrap** once per account/region: `cd infra/cdk && npx cdk bootstrap`.

## Environment

| Variable | Used by | Description |
|----------|---------|-------------|
| `CDK_DEFAULT_ACCOUNT` | infra | AWS account ID for CDK |
| `CDK_DEFAULT_REGION` | infra, app | Region (e.g. `ap-southeast-1`) |
| `AWS_DEFAULT_REGION` | app | If set, overrides region for CLI/Docker ECR login |
| `STACK_NAME` | app | Default `TeacherStudentStack` |
| `IMAGE_TAG` | app | Image tag to build/push; **must match** CDK context `ecrImageTag` (default `latest`) |

## Two-step flow (recommended in CI)

1. **`deploy-infra.sh`** — `cdk deploy` only (VPC, RDS, ALB, ECS service, **empty ECR ready for push**).  
   - ECS tasks may fail until an image exists; that is expected until step 2.

2. **`deploy-app.sh`** — `docker build` (linux/amd64), `docker push` to stack output `EcrRepositoryUri`, `aws ecs update-service --force-new-deployment`, `aws ecs wait services-stable`.

```bash
chmod +x scripts/aws/deploy-infra.sh scripts/aws/deploy-app.sh
export CDK_DEFAULT_ACCOUNT=123456789012
export CDK_DEFAULT_REGION=ap-southeast-1

./scripts/aws/deploy-infra.sh
./scripts/aws/deploy-app.sh
```

## One-shot flow

```bash
./scripts/aws/deploy-all.sh
# Pass CDK flags through to the first step:
./scripts/aws/deploy-all.sh -c production=true
```

## Image tag and CDK

The task definition references **`ecrImageTag`** from CDK context (default `latest` in [`cdk.json`](../../infra/cdk/cdk.json)). If you deploy with another tag:

```bash
npx cdk deploy -c ecrImageTag=v1.0.0
IMAGE_TAG=v1.0.0 ./scripts/aws/deploy-app.sh
```

If the tag in ECR does not match what the task definition expects, ECS will fail to pull the image.

## Outputs

After deploy, inspect the stack in the console or:

```bash
aws cloudformation describe-stacks --stack-name TeacherStudentStack \
  --query 'Stacks[0].Outputs' --output table
```

Key outputs: **`ApiUrl`**, **`EcrRepositoryUri`**, **`EcrImageUri`**, **`ClusterName`**, **`ServiceName`**.

More context: [docs/aws-deploy-scripts.md](../../docs/aws-deploy-scripts.md) and the root [README.md](../../README.md).
