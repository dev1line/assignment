import * as path from "path";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as logs from "aws-cdk-lib/aws-logs";
import * as rds from "aws-cdk-lib/aws-rds";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import type { Construct } from "constructs";

/** Repo root (this file: infra/cdk/lib). */
const REPO_ROOT = path.join(__dirname, "..", "..", "..");

const DEFAULT_DB_NAME = "teacher_student_db";

function parseEnumKey<T extends Record<string, string>>(
  enumObj: T,
  raw: string,
  label: string,
): T[keyof T] {
  const key = raw.toUpperCase() as keyof T;
  const v = enumObj[key];
  if (v === undefined) {
    throw new Error(`Unknown ${label}: ${raw}`);
  }
  return v as T[keyof T];
}

export class TeacherStudentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const production = Boolean(this.node.tryGetContext("production"));
    const desiredCount = Number(this.node.tryGetContext("desiredCount") ?? 1);
    const corsOrigin = String(this.node.tryGetContext("corsOrigin") ?? "");
    const rdsAllocatedStorage = Number(this.node.tryGetContext("rdsAllocatedStorage") ?? 20);
    const rdsInstanceClass = parseEnumKey(
      ec2.InstanceClass,
      String(this.node.tryGetContext("rdsInstanceClass") ?? "T4G"),
      "rdsInstanceClass",
    );
    const rdsInstanceSize = parseEnumKey(
      ec2.InstanceSize,
      String(this.node.tryGetContext("rdsInstanceSize") ?? "MICRO"),
      "rdsInstanceSize",
    );

    const removalPolicy = production ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC },
        { name: "private", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      ],
    });

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    const apiImage = ecs.ContainerImage.fromAsset(REPO_ROOT, {
      file: "Dockerfile",
      target: "runtime",
      platform: Platform.LINUX_AMD64,
    });

    const dbSecurityGroup = new ec2.SecurityGroup(this, "DatabaseSecurityGroup", {
      vpc,
      description: "RDS MySQL - only ECS tasks",
      allowAllOutbound: false,
    });

    const database = new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0_40,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSecurityGroup],
      instanceType: ec2.InstanceType.of(rdsInstanceClass, rdsInstanceSize),
      allocatedStorage: rdsAllocatedStorage,
      credentials: rds.Credentials.fromGeneratedSecret("admin"),
      databaseName: DEFAULT_DB_NAME,
      removalPolicy,
      deletionProtection: production,
      publiclyAccessible: false,
      storageEncrypted: true,
      backupRetention: production ? Duration.days(7) : Duration.days(0),
      preferredMaintenanceWindow: "sun:05:00-sun:06:00",
    });

    const dbSecret = database.secret;
    if (!dbSecret) {
      throw new Error("Expected RDS instance to have a generated secret");
    }

    const logGroup = new logs.LogGroup(this, "ApiLogGroup", {
      retention: production ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy,
    });

    const fargate = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "ApiService", {
      cluster,
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      publicLoadBalancer: true,
      assignPublicIp: false,
      desiredCount,
      cpu: 256,
      memoryLimitMiB: 512,
      healthCheckGracePeriod: Duration.seconds(300),
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      circuitBreaker: { rollback: true },
      taskImageOptions: {
        image: apiImage,
        containerPort: 3000,
        environment: {
          NODE_ENV: "production",
          PORT: "3000",
          TRUST_PROXY_HOPS: "1",
          MIGRATE_MAX_ATTEMPTS: "60",
          MIGRATE_RETRY_SLEEP_SEC: "5",
          ...(corsOrigin !== "" ? { CORS_ORIGIN: corsOrigin } : {}),
        },
        secrets: {
          DB_USER: ecs.Secret.fromSecretsManager(dbSecret, "username"),
          DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, "password"),
          DB_HOST: ecs.Secret.fromSecretsManager(dbSecret, "host"),
          DB_PORT: ecs.Secret.fromSecretsManager(dbSecret, "port"),
          DB_NAME: ecs.Secret.fromSecretsManager(dbSecret, "dbname"),
        },
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: "api",
          logGroup,
        }),
      },
    });

    fargate.service.node.addDependency(database);

    fargate.targetGroup.configureHealthCheck({
      path: "/",
      healthyHttpCodes: "200",
      interval: Duration.seconds(30),
      timeout: Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    database.connections.allowFrom(
      fargate.service.connections,
      ec2.Port.tcp(3306),
      "ECS tasks to MySQL",
    );

    new cdk.CfnOutput(this, "ApiUrl", {
      value: `http://${fargate.loadBalancer.loadBalancerDnsName}`,
      description: "API base URL (Docker image built by CDK on deploy; migrations on task startup)",
    });

    new cdk.CfnOutput(this, "LoadBalancerDns", {
      value: fargate.loadBalancer.loadBalancerDnsName,
      description: "ALB DNS name",
    });

    new cdk.CfnOutput(this, "ClusterName", {
      value: cluster.clusterName,
    });

    new cdk.CfnOutput(this, "ServiceName", {
      value: fargate.service.serviceName,
    });

    new cdk.CfnOutput(this, "RdsSecretArn", {
      value: dbSecret.secretArn,
      description: "Secrets Manager ARN for DB credentials (migrate task / debugging)",
    });

    new cdk.CfnOutput(this, "VpcId", {
      value: vpc.vpcId,
    });

    new cdk.CfnOutput(this, "PrivateSubnetIds", {
      value: vpc.privateSubnets.map((s) => s.subnetId).join(","),
      description: "Private subnets (ECS / RDS)",
    });
  }
}
