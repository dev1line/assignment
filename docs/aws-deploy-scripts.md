# AWS deployment: ECR image + scripts

The CDK stack **`TeacherStudentStack`** creates an **application ECR repository** and points the ECS task definition at **`repositoryUri:ecrImageTag`** (default tag `latest`, configurable via context).

Infrastructure deployment and application image rollout are **separate steps**, automated by shell scripts under [`scripts/aws/`](../scripts/aws/).

## Why two phases?

1. **CloudFormation / CDK** provisions VPC, RDS, ALB, ECS service, and **ECR** — no Docker required on the deploy runner for this phase only.
2. **Docker** builds the API image and **pushes** to your ECR repository; **ECS** is then told to start a new deployment so tasks pull the new digest.

This matches common CI patterns: pipeline job A runs `cdk deploy`, job B runs `docker build && docker push && ecs update-service`.

## Scripts

| Script | Purpose |
|--------|---------|
| [`scripts/aws/deploy-infra.sh`](../scripts/aws/deploy-infra.sh) | `cdk deploy` only (pass extra args, e.g. `-c production=true`) |
| [`scripts/aws/deploy-app.sh`](../scripts/aws/deploy-app.sh) | `docker build` (linux/amd64) → `docker push` → `update-service --force-new-deployment` → `wait services-stable` |
| [`scripts/aws/deploy-all.sh`](../scripts/aws/deploy-all.sh) | Runs **infra** then **app** in sequence |

Details and environment variables: [`scripts/aws/README.md`](../scripts/aws/README.md).

## Required environment

```bash
export CDK_DEFAULT_ACCOUNT=123456789012
export CDK_DEFAULT_REGION=ap-southeast-1
```

For `deploy-app.sh`, `AWS_DEFAULT_REGION` may be used if you prefer it over `CDK_DEFAULT_REGION`.

## Typical commands

**Sequential (two terminals or CI jobs):**

```bash
./scripts/aws/deploy-infra.sh
./scripts/aws/deploy-app.sh
```

**Single command:**

```bash
./scripts/aws/deploy-all.sh
```

## Image tag vs CDK

The ECS task definition is synthesized with tag **`ecrImageTag`** from [`infra/cdk/cdk.json`](../infra/cdk/cdk.json) (default `latest`). The push script uses env **`IMAGE_TAG`** (default `latest`). **They must match.**

Example for a versioned tag:

```bash
cd infra/cdk && npx cdk deploy -c ecrImageTag=v1.2.3
cd ../..
IMAGE_TAG=v1.2.3 ./scripts/aws/deploy-app.sh
```

## First deploy note

Until the first image is pushed, ECS tasks may enter a **pull error** state. After `deploy-app.sh` completes and `services-stable` returns, open **`ApiUrl`** from the stack outputs.

## See also

- [Current stack flows (Mermaid)](./aws-current-stack-flows.md) — topology including app ECR
- [AWS CDK — risks and mitigations](./aws-cdk-risks-and-mitigations.md)
- [AWS deployment — architecture, Cognito, CDK](./aws-cognito-ecs-deployment.md)
