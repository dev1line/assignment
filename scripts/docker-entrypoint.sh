#!/bin/sh
set -eu

# Wait for RDS + run migrations, then start API (Fargate / ALB deploy-ready).
MAX_MIGRATE_ATTEMPTS="${MIGRATE_MAX_ATTEMPTS:-60}"
SLEEP_SEC="${MIGRATE_RETRY_SLEEP_SEC:-5}"

n=0
while true; do
    if npx sequelize-cli db:migrate --env production; then
        break
    fi
    n=$((n + 1))
    if [ "$n" -ge "$MAX_MIGRATE_ATTEMPTS" ]; then
        echo "docker-entrypoint: db:migrate failed after ${n} attempts" >&2
        exit 1
    fi
    echo "docker-entrypoint: migrate not ready yet (attempt ${n}/${MAX_MIGRATE_ATTEMPTS}), retrying in ${SLEEP_SEC}s..." >&2
    sleep "$SLEEP_SEC"
done

echo "docker-entrypoint: starting Node API on PORT=${PORT:-3000}" >&2
exec node dist/src/server.js
