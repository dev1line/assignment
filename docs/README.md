# Documentation index

All supplementary docs are in **English**.

| Document | Description |
|----------|-------------|
| [AWS deployment — reference architecture, Cognito, CDK](./aws-cognito-ecs-deployment.md) | Reference diagram (CloudFront/S3, VPC, ALB, ECS Fargate, RDS, Cognito), **`infra/cdk`** layout, `context`, `CDK_DEFAULT_*`, checklist, scope vs the diagram |
| [AWS deploy scripts (ECR + ECS)](./aws-deploy-scripts.md) | Two-phase deploy, `ecrImageTag` / `IMAGE_TAG`, links to [`scripts/aws/`](../scripts/aws/) |
| [Current stack flows (Mermaid)](./aws-current-stack-flows.md) | Diagrams aligned with **`TeacherStudentStack`**: VPC topology, HTTP path, container startup, infra vs image deploy |
| [AWS CDK — risks and mitigations](./aws-cdk-risks-and-mitigations.md) | Operational risks (migrations, ECR tags, TLS, auth, NAT, secrets, destroy) and mitigations |

Local run, Docker Compose, tests, and API overview are in the root [README.md](../README.md). CDK source is under [infra/cdk/](../infra/cdk/).
