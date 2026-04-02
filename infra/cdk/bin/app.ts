#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { TeacherStudentStack } from "../lib/teacher-student-stack";

const app = new cdk.App();

new TeacherStudentStack(app, "TeacherStudentStack", {
  description: "Teacher-Student API: VPC, RDS MySQL, ECR, ECS Fargate, ALB",
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
