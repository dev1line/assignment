# AWS CDK deployment: risks and mitigations

This document describes operational and architectural risks of the current **`TeacherStudentStack`** ([`infra/cdk/lib/teacher-student-stack.ts`](../infra/cdk/lib/teacher-student-stack.ts)) and practical ways to reduce them. It is written for teams operating the Teacher-Student API on **ECS Fargate**, **RDS MySQL**, and an **internet-facing ALB**.

---

## 1. Migrations run on every task startup

**Risk:** The container [`scripts/docker-entrypoint.sh`](../scripts/docker-entrypoint.sh) runs `sequelize-cli db:migrate` before `node` starts. With **`desiredCount` > 1** or during rolling deployments (two tasks briefly), **multiple containers can execute migrations concurrently**. Sequelize’s metadata table usually makes re-runs no-ops, but **non-idempotent or data migrations** can corrupt data or deadlock.

**Mitigations (best → acceptable):**

- **Optimal:** Run migrations in a **single-shot pipeline step** (CodeBuild, GitHub Actions, or `aws ecs run-task` with a dedicated task definition) **before** scaling the service or releasing a new task definition. Remove or gate the migrate step in the entrypoint for production (`SKIP_MIGRATE_ON_START=true` pattern, or split images: `api` vs `migrate`).
- **Practical:** Keep **`desiredCount: 1`** and accept brief dual-task windows during deploy; ensure **all migrations are backward-compatible and safe to run twice** (expand/contract pattern).
- **Minimum:** Add **advisory locking** or a migration tool that supports leader election if you must keep in-task migrate at scale.

---

## 2. ECR image must exist before tasks stay healthy

**Risk:** The stack uses an **app-owned ECR repository** and **`fromEcrRepository(..., ecrImageTag)`**. After **`cdk deploy`**, if no image has been **pushed** for that tag, ECS tasks will **fail to start** until `docker push` (or CI) completes. Tag in ECR must match **CDK context `ecrImageTag`** and the **`IMAGE_TAG`** used by [`scripts/aws/deploy-app.sh`](../scripts/aws/deploy-app.sh).

**Mitigations:**

- **Optimal:** CI pipeline: job 1 **`deploy-infra.sh` / `cdk deploy`**, job 2 **`deploy-app.sh`** (build, push, `update-service --force-new-deployment`); use **immutable tags** (`v1.2.3`) and bump **`ecrImageTag`** when you change the task definition.
- **Practical:** Run **`scripts/aws/deploy-all.sh`** locally for a full sequence; use **`linux/amd64`** builds for Fargate x86 (the script passes `--platform linux/amd64`).
- **Alternative:** Re-enable **CDK `fromAsset`** if you want a single **`cdk deploy`** with Docker on the same machine (trade-off: images land in **bootstrap asset ECR**, not the app repo).

---

## 3. HTTP-only listener on the ALB

**Risk:** The default stack exposes **port 80 only** (no TLS termination on the ALB). Traffic between clients and the load balancer can be **intercepted or modified** on the network.

**Mitigations:**

- **Optimal:** Add an **ACM certificate** and an **HTTPS listener (443)**; optionally redirect HTTP → HTTPS. For a public SPA, often terminate TLS at **CloudFront** and restrict ALB to CloudFront (custom headers / AWS-managed origins) or private connectivity.
- **Practical:** At minimum, enforce HTTPS at a **CDN or reverse proxy** in front of the ALB and treat the ALB as a controlled hop.

---

## 4. No application authentication

**Risk:** The API is built as an assignment service **without JWT/API keys**. Anything that can reach the ALB can call **`/api`** subject only to **rate limits** and **CORS** (browser).

**Mitigations:**

- **Optimal:** Put **Amazon Cognito** (or another IdP) in front of the API—**ALB OIDC** or **Bearer JWT validation in Express**—and tighten **security groups** so the ALB is not unnecessarily public if the API is internal-only.
- **Practical:** Restrict **source IPs** (corporate VPN), use **AWS WAF** on the ALB, and tune **`RATE_LIMIT_*`** and **`CORS_ORIGIN`** for production (`-c corsOrigin=…` in CDK).

---

## 5. NAT Gateway cost and availability

**Risk:** Private Fargate tasks use a **single NAT Gateway** (as configured) for egress (pulling images, AWS APIs, npm if ever added). **NAT is a recurring cost** and a **single-AZ dependency** for outbound traffic from private subnets (unless you add redundancy).

**Mitigations:**

- **Optimal:** Add **VPC interface endpoints** for **ECR**, **S3** (gateway), and **CloudWatch Logs** so tasks do not need the NAT for those paths; keep or reduce NAT only for what still needs the open internet.
- **Practical:** For dev, accept one NAT; for production, evaluate **second NAT** in another AZ or endpoint-only egress.

---

## 6. RDS availability vs. ECS task start

**Risk:** If RDS is slow to become **available** or credentials in Secrets Manager are not yet fully populated, **`db:migrate` can fail**. The entrypoint **retries** up to `MIGRATE_MAX_ATTEMPTS` (default 60 × 5s ≈ 5 minutes). **Misconfigured migrations** (syntax error, wrong env) retry until timeout, delaying useful error signal.

**Mitigations:**

- **Optimal:** Use **separate migrate job** with clear failure in CI/CD; keep API entrypoint as **start server only**.
- **Practical:** Lower noise by **distinguishing connection errors** from migration failures (custom script); **CloudWatch alarms** on ECS task restart count and **5xx** at the ALB.

---

## 7. Secrets and IAM

**Risk:** Database credentials are injected as **ECS secrets** from **Secrets Manager**. The **task execution role** can read the secret; compromise of a task could expose env at runtime. **Overly broad task roles** increase blast radius.

**Mitigations:**

- **Optimal:** **Least-privilege** task role (often empty for this API if it only talks to RDS over the network with user/pass in env). Rotate RDS passwords via **Secrets Manager rotation** if required by policy.
- **Practical:** Avoid logging env or connection strings; the app already redacts common secret paths in logs.

---

## 8. Stack destroy and data retention

**Risk:** With **`production: false`** (default context), **RDS/ECR-related resources** may use **destructive removal policies** suitable for sandboxes. Accidental **`cdk destroy`** can delete data.

**Mitigations:**

- **Optimal:** Use **`-c production=true`** for long-lived environments; enable **deletion protection** and **backup retention** (already wired for production-style settings in stack).
- **Practical:** Restrict **`cdk destroy`** in CI; use **separate AWS accounts** for prod vs dev.

---

## 9. ALB health check vs. application semantics

**Risk:** Health checks target **`GET /`**, which does not hit the database. A task can be marked **healthy** while **DB connectivity is broken** for real API routes (unlikely right after start if `sequelize.authenticate()` runs at boot, but worth knowing if that changes).

**Mitigations:**

- **Optimal:** Add a **`/health/ready`** that checks DB (with timeout) and point the **target group** at it when you need **readiness** distinct from **liveness**.
- **Practical:** Keep current **`/`** check for fast, cheap ALB checks; rely on **logs and alarms** for DB outages after boot.

---

## 10. Documentation drift

**Risk:** Diagrams or checklists may lag behind **`TeacherStudentStack`** (for example ECR vs CDK asset, or migrate-on-start).

**Mitigations:**

- **Optimal:** Treat [`infra/cdk/lib/teacher-student-stack.ts`](../infra/cdk/lib/teacher-student-stack.ts), [`aws-current-stack-flows.md`](./aws-current-stack-flows.md), and [`aws-deploy-scripts.md`](./aws-deploy-scripts.md) as the **source of truth**; update this file when behavior changes.

---

## Summary table

| Risk | Severity (typical) | Preferred mitigation |
|------|-------------------|----------------------|
| Concurrent migrations | High at scale | One-shot migrate in CI / run-task; no migrate in multi-task entrypoint |
| Missing ECR image / tag mismatch | Medium | Run `deploy-app.sh` after infra; align `ecrImageTag` and `IMAGE_TAG` |
| Plain HTTP | High (public) | ACM + HTTPS / CloudFront TLS |
| No API auth | High (public) | Cognito / JWT / WAF / network restriction |
| NAT cost / SPOF | Medium (cost/ops) | VPC endpoints; optional second NAT |
| Retry loop hides bad migrations | Medium | External migrate step + alarms |
| Secret / IAM exposure | Medium | Least privilege; rotation |
| Accidental destroy | High (data) | `production` context; separate accounts |

---

## See also

- [AWS deploy scripts (ECR + ECS)](./aws-deploy-scripts.md) — `deploy-infra.sh` / `deploy-app.sh`
- [Current stack flows (Mermaid)](./aws-current-stack-flows.md) — topology and runtime sequences for `TeacherStudentStack`
- [AWS deployment (architecture, Cognito, CDK)](./aws-cognito-ecs-deployment.md) — reference diagram, CDK layout, checklist

---

*Adjust controls to your organization’s security, compliance, and SLO requirements.*
