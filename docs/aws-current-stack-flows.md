# Operational flows for the current code (`TeacherStudentStack`)

This document describes the **actual** CDK stack and API container behavior as implemented in:

- [`infra/cdk/lib/teacher-student-stack.ts`](../infra/cdk/lib/teacher-student-stack.ts)
- [`Dockerfile`](../Dockerfile) target `runtime` and [`scripts/docker-entrypoint.sh`](../scripts/docker-entrypoint.sh)
- [`src/server.ts`](../src/server.ts) (HTTP server starts after the database is reachable)

## Where diagrams live in the repo

| What | Location |
|------|----------|
| **Reference architecture image** (CloudFront, S3, Cognito, etc. — *target / extension*) | [`docs/images/aws-reference-architecture.png`](./images/aws-reference-architecture.png), embedded in [`aws-cognito-ecs-deployment.md`](./aws-cognito-ecs-deployment.md) |
| **Flows that match the current CDK + container** (renders on GitHub / GitLab) | **This file** — **Mermaid** diagrams below |

---

## 1. VPC topology and AWS components (as defined in the stack)

```mermaid
flowchart TB
  subgraph internet [Internet]
    users[Clients]
  end

  subgraph vpc [VPC two AZs]
    subgraph public [Public subnets]
      igw[InternetGateway]
      alb[ApplicationLoadBalancer]
      nat[NAT_Gateway x1]
    end
    subgraph private [Private subnets with egress]
      ecs[ECS_Fargate_tasks]
      rds[RDS_MySQL]
    end
  end

  subgraph awsManaged [AWS managed]
    sm[Secrets_Manager_DB_secret]
    cw[CloudWatch_Logs]
    ecrApp[App_ECR_repository_in_stack]
  end

  users --> igw
  igw --> alb
  alb -->|"TCP 3000 SG"| ecs
  ecs -->|"TCP 3306 SG"| rds
  ecs --> sm
  ecs --> cw
  ecs --> nat
  nat --> igw
  ecrApp -.->|"docker push then pull"| ecs
```

**Notes (from code):**

- **No** CloudFront, S3 frontend, or Cognito in the current CDK app.
- The stack creates an **`ecr.Repository`**; the task uses **`fromEcrRepository(..., ecrImageTag)`**. You **build and push** the image with [`scripts/aws/deploy-app.sh`](../scripts/aws/deploy-app.sh) (or CI) — see [aws-deploy-scripts.md](./aws-deploy-scripts.md).
- Fargate tasks have **no** public IP; outbound traffic (e.g. pull from ECR) uses the **NAT Gateway**.

---

## 2. HTTP flow: request to the API

```mermaid
sequenceDiagram
  participant C as Client
  participant ALB as ALB
  participant TG as TargetGroup
  participant F as Fargate_container_Express
  participant D as RDS_MySQL

  C->>ALB: HTTP GET_or_POST
  ALB->>TG: forward
  TG->>F: TCP 3000
  F->>D: SQL via Sequelize when needed
  D-->>F: rows
  F-->>ALB: JSON response
  ALB-->>C: response plus headers
```

ALB health check: **`GET /`** (that route does not query the DB; the process still required the DB to be up during bootstrap — see diagram 3).

---

## 3. Container lifecycle: from task start to listening

```mermaid
flowchart TD
  start[ECS starts task]
  secrets[Inject env plus Secrets_Manager DB_star]
  loopMigrate{sequelize_cli db_migrate production}
  retry[Sleep MIGRATE_RETRY_SLEEP_SEC]
  fail[Exit non_zero after max attempts]
  nodeStart["exec: node dist/src/server.js"]
  auth["sequelize.authenticate()"]
  listen["HTTP listen on PORT"]

  start --> secrets
  secrets --> loopMigrate
  loopMigrate -->|success| nodeStart
  loopMigrate -->|fail| retry
  retry --> loopMigrate
  loopMigrate -->|max attempts| fail
  nodeStart --> auth
  auth -->|ok| listen
  auth -->|error| exitFail["process.exit(1)"]
```

Details: [`scripts/docker-entrypoint.sh`](../scripts/docker-entrypoint.sh), then [`src/server.ts`](../src/server.ts).

---

## 4. Deploy flow: infrastructure then image (summary)

Phase **A** does not require Docker. Phase **B** requires Docker.

```mermaid
flowchart TB
  subgraph phaseA [Phase A infra]
    cdk[cdk deploy or deploy_infra_sh]
    cfn[CloudFormation]
    ecrCreate[ECR repository]
    rdsCreate[RDS plus secret]
    ecsSvc[ECS service plus task definition]
  end

  subgraph phaseB [Phase B application]
    build[docker build linux_amd64]
    push[docker push to app ECR]
    roll[ecs update_service force_new_deployment]
    wait[ecs wait services_stable]
  end

  cdk --> cfn
  cfn --> ecrCreate
  cfn --> rdsCreate
  cfn --> ecsSvc
  build --> push
  push --> roll
  roll --> wait
```

Automated sequence: [`scripts/aws/deploy-all.sh`](../scripts/aws/deploy-all.sh), or run [`deploy-infra.sh`](../scripts/aws/deploy-infra.sh) then [`deploy-app.sh`](../scripts/aws/deploy-app.sh). Details: [aws-deploy-scripts.md](./aws-deploy-scripts.md).

---

## Quick comparison: reference image vs current stack

| Component | [`aws-reference-architecture.png`](./images/aws-reference-architecture.png) | Current `TeacherStudentStack` |
|-----------|-----------------------------------------------------------------------------|--------------------------------|
| CloudFront + S3 | Yes (frontend) | **Not** in CDK |
| Cognito | Yes (auth) | **Not** in CDK; app does not verify JWT yet |
| ALB + ECS Fargate + RDS | Yes | **Yes** |
| Dedicated “app” ECR repo | Implied | **Yes** — stack-owned repo; **push** via script or CI |
| DB migrations | Outside app | **Yes** in container [`docker-entrypoint.sh`](../scripts/docker-entrypoint.sh) |

See also: [`aws-cdk-risks-and-mitigations.md`](./aws-cdk-risks-and-mitigations.md).
