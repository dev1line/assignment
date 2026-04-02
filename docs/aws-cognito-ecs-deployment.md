# AWS deployment: reference architecture, Cognito, and CDK

This document describes the **target architecture** (static frontend + API on ECS Fargate + RDS MySQL + Cognito), the **CDK layout** kept separate from the Node API app, and how to integrate **authentication and authorization** with Amazon Cognito. The Express app in this repository **does not** implement JWT or Cognito yet; Cognito is an extension path.

## Reference architecture (diagram)

The figure below is a **generated reference diagram** for this project (not official AWS branding): static frontend on **CloudFront** + **S3**; API traffic via **ALB** to **ECS on Fargate** and **RDS MySQL** inside a **VPC**; **Cognito** for sign-in; **ECR** and **CloudWatch Logs** shown with links to the **ECS** backend. The CDK stack in the repo implements the VPC / ALB / ECS / RDS / ECR / logs path; CloudFront, S3, and Cognito are documented as follow-on work.

![Reference architecture: users, CloudFront, S3, VPC (IGW, public: ALB + NAT, private: ECS Fargate + RDS MySQL), Cognito, ECR, CloudWatch → ECS](./images/aws-reference-architecture.png)

### Data flows (summary)

| Flow | Path |
|------|------|
| **Static frontend** | Users → **CloudFront** (HTTPS) → **S3** (static website or protected origin). |
| **API** | Client → **ALB** (public subnet, via Internet Gateway) → **target group** → **ECS on Fargate** (private subnet) → **RDS MySQL** (private subnet). |
| **Container image** | **App ECR repository** created by the stack; **`docker build` + `docker push`** (see [`scripts/aws/deploy-app.sh`](../scripts/aws/deploy-app.sh)) then ECS pulls by tag (`ecrImageTag` context, default `latest`). |
| **Application logging** | **ECS task** → **CloudWatch Logs** (log group / stream; no DB involvement). |
| **Private egress** | Fargate tasks → **NAT Gateway** (public subnet) → internet (e.g. pull from ECR, AWS APIs). |
| **Auth (Cognito)** | Users sign in to **Cognito User Pool** (Hosted UI / SDK) → receive JWT. Call the API with `Authorization: Bearer …` (**option A** in the app) or use **Authenticate: Cognito** on the ALB for a browser flow (**option B**). |

## CDK — separate from the Node API

CDK lives under **`infra/cdk`** with its own `package.json` so CDK dependencies are **not** mixed into the API [package.json](../package.json).

### Repository layout

| Path | Role |
|------|------|
| [infra/cdk/package.json](../infra/cdk/package.json) | `aws-cdk-lib`, `constructs`, `typescript`, `ts-node`, `aws-cdk` CLI. |
| [infra/cdk/cdk.json](../infra/cdk/cdk.json) | CDK app config and default `context`. |
| [infra/cdk/tsconfig.json](../infra/cdk/tsconfig.json) | TypeScript for CDK. |
| [infra/cdk/bin/app.ts](../infra/cdk/bin/app.ts) | `cdk.App`, stack instantiation; `env.account` / `env.region` from **`CDK_DEFAULT_ACCOUNT`** and **`CDK_DEFAULT_REGION`** (no hard-coded account). |
| [infra/cdk/lib/teacher-student-stack.ts](../infra/cdk/lib/teacher-student-stack.ts) | Stack: **VPC**, **RDS MySQL**, **ECR**, **ECS cluster + Fargate + ALB**, **CloudWatch log group**; SG allows ECS → RDS on MySQL. |

### CDK context (`cdk.json` / `cdk context`)

Tune via `context` or `-c key=value` on `cdk deploy`:

| Key | Meaning (current stack) |
|-----|-------------------------|
| `production` | `true`: stricter retention / deletion protection for RDS, ECR, logs, etc. |
| `desiredCount` | Desired Fargate task count for the API service. |
| `corsOrigin` | When non-empty, sets `CORS_ORIGIN` on the container (production frontend origin). |
| `rdsAllocatedStorage` | RDS allocated storage (GiB). |
| `rdsInstanceClass` / `rdsInstanceSize` | RDS instance shape (e.g. `T4G` + `MICRO`). |
| `ecrImageTag` | ECS task image tag in ECR (must match **`IMAGE_TAG`** when running [`deploy-app.sh`](../scripts/aws/deploy-app.sh)). |

**Optional future context:** `minHealthyPercent`, `maxHealthyPercent`, `domainName` (for **ACM** + **Route 53** on ALB or CloudFront), `certificateArn` — add when you extend the stack.

### Deploy from a developer machine

```bash
cd infra/cdk
npm install
export CDK_DEFAULT_ACCOUNT=123456789012
export CDK_DEFAULT_REGION=ap-southeast-1
npx cdk bootstrap   # once per account/region
npx cdk deploy
```

After **`cdk deploy`** (or [`deploy-infra.sh`](../scripts/aws/deploy-infra.sh)): run **[`deploy-app.sh`](../scripts/aws/deploy-app.sh)** (or [`deploy-all.sh`](../scripts/aws/deploy-all.sh)) to **build, push to ECR, and roll ECS**. Tasks then run **`db:migrate`** via [`scripts/docker-entrypoint.sh`](../scripts/docker-entrypoint.sh), then the Node server. Use stack output **`ApiUrl`** when the service is stable.

**Deploy scripts guide:** [`aws-deploy-scripts.md`](./aws-deploy-scripts.md). **Diagrams (Mermaid):** [`aws-current-stack-flows.md`](./aws-current-stack-flows.md).

## Current CDK stack vs. the reference diagram

- **In `TeacherStudentStack` today:** VPC (2 AZs, **1 NAT**), **public** and **private with egress** subnets, **Internet Gateway**, internet-facing **ALB**, **ECS Fargate** (private, no public IP), **RDS MySQL 8** (private), **ECR repository** for the API image, **CloudWatch Logs** for the API task, DB credentials from **Secrets Manager** injected into the task; **migrations on container start** (see entrypoint script).
- **Not in this CDK stack yet (next steps vs. full diagram):** **CloudFront**, **S3** frontend, **Amazon Cognito**, **ACM** / custom **domainName**, **Route 53**. Add a second stack or constructs when you implement the full picture.

## Cognito: authentication and authorization

### Option A — Verify JWT in the application (REST / SPA bearer token)

- ALB handles TLS, routing, and health checks only.
- Express middleware verifies JWT with the User Pool **JWKS** (`iss`, `aud` / `client_id`, expiry); use **groups** or custom claims for **authorization**.

### Option B — Authenticate at the ALB (Cognito)

- Listener rule **Authenticate: Amazon Cognito** — suited to web apps with redirect/cookies; see AWS docs for OIDC headers the ALB adds after authentication.

Many teams use **A for APIs** and **B** for a specific web surface if needed.

`TRUST_PROXY_HOPS=1` on the task (set in this stack) matches a single ALB hop in front of the app.

## CI/CD (suggested)

- **Job 1 — infra:** `cdk deploy` or [`deploy-infra.sh`](../scripts/aws/deploy-infra.sh) (no Docker required).
- **Job 2 — app:** `docker build` / `docker push` to the stack ECR + `ecs update-service --force-new-deployment` (see [`deploy-app.sh`](../scripts/aws/deploy-app.sh)).
- Migrations: **on task start** today ([`scripts/docker-entrypoint.sh`](../scripts/docker-entrypoint.sh)); for larger scale use a **one-shot migrate** step ([`aws-cdk-risks-and-mitigations.md`](./aws-cdk-risks-and-mitigations.md)).

## Quick checklist

1. Bootstrap CDK; deploy stack with `CDK_DEFAULT_*` ([`deploy-infra.sh`](../scripts/aws/deploy-infra.sh) or `cdk deploy`).
2. Run [`deploy-app.sh`](../scripts/aws/deploy-app.sh) (Docker required) so ECR has an image and ECS rolls; wait until the service is stable and `GET /` is healthy on the ALB.
3. Migrations run automatically when each new task starts (unless you change the entrypoint).
4. (Full stack) Add S3 + CloudFront; set `CORS_ORIGIN` to the CloudFront or app URL.
5. Create a Cognito User Pool and app client; implement **A** and/or **B**.
6. (Optional) ACM + Route 53 + HTTPS on the ALB (or TLS at CloudFront depending on design).

## See also in this repo

- [README.md](../README.md) — local run, Docker Compose, documentation table, AWS deploy scripts.
- [AWS deploy scripts (ECR + ECS)](./aws-deploy-scripts.md) and [`scripts/aws/README.md`](../scripts/aws/README.md).
- [Current stack flows (Mermaid)](./aws-current-stack-flows.md) — implemented VPC / HTTP / container / deploy flows.
- [AWS CDK — risks and mitigations](./aws-cdk-risks-and-mitigations.md).
- API environment variables: [.env.example](../.env.example).
- OpenAPI: `/api-docs` when the API is running.

---

*This is guidance only; adjust IAM, networking, and compliance for your organization.*
