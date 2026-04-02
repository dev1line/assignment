FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# One-off DB migrations: docker build --target migrate -t api:migrate .
# Push to ECR as e.g. :migrate, then run an ECS Fargate task (same VPC private subnets,
# same RDS secret env as the API task) with command overridden if needed.
# This stage must NOT be last: the default image for ECS/CDK is the final stage below.
FROM node:20-alpine AS migrate

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci

COPY .sequelizerc ./
COPY db ./db

CMD ["npx", "sequelize-cli", "db:migrate", "--env", "production"]

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY .sequelizerc ./
COPY db ./db
COPY scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
