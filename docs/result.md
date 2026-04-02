# Deployment screenshots

Screenshots from verifying the Teacher-Student API on AWS (Swagger UI, CloudFormation, ECS logs).

## Swagger UI — Teacher-Student API on ALB

OpenAPI documentation served at `/api-docs/` behind the Application Load Balancer.

![Swagger UI — Teacher-Student API on ALB](./images/swagger-ui-teacher-student-api-alb.png)

## CloudFormation — TeacherStudentStack resources

Stack **TeacherStudentStack**, Resources tab: VPC, cluster, RDS, ECS service, log group, and related resources in `CREATE_COMPLETE`.

![CloudFormation — TeacherStudentStack resources](./images/cloudformation-teacherstudentstack-resources.png)

## ECS — API service logs

Amazon ECS service logs (container `web`): JSON application logs for `teacher-student-api` (e.g. `GET /` 200).

![ECS — Teacher-Student API service logs](./images/ecs-teacher-student-api-service-logs.png)
