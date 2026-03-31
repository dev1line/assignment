# Teacher-Student API

Node.js + TypeScript API for teacher-student administrative operations.

## Hosted API

- N/A (not deployed yet)

## Tech Stack

- Node.js + Express
- TypeScript
- MySQL 8
- Sequelize + Sequelize CLI
- Jest + Supertest

## Prerequisites

- Node.js 18+ (or newer LTS)
- npm
- Docker Desktop (for local MySQL)

## Environment Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment files:

```bash
cp .env.example .env
```

The project also includes `.env.test` for test runtime configuration.
Docker Compose also reads variables from `.env` (for example `MYSQL_ROOT_PASSWORD`, `MYSQL_PORT`, `DOCKER_DB_HOST`).

Default values:

- Dev DB (development): `localhost:3306`, db `teacher_student_db`, user `root`, password `password`
- Test DB (integration): `localhost:3306`, db `teacher_student_test_db`, user `root`, password `password`
- API port: `3000`

## Run Local API (Quick Start)

1. Start MySQL service:

```bash
docker compose up -d
```

2. Run database migrations and seed data:

```bash
npm run db:migrate
npm run db:seed
```

3. Start API in development mode:

```bash
npm run dev
```

API will be available at `http://localhost:3000`.

## Build and Run Production Mode

```bash
npm run build
npm start
```

## Deploy with Docker

### Full stack (API + MySQL) with Docker Compose

Build and run:

```bash
docker compose up -d --build
```

API: `http://localhost:3000`. MySQL is reachable on `localhost:3306` from the host.

Stop:

```bash
docker compose down
```

The `app` service uses `DB_HOST=db` (Docker network DNS) and waits for MySQL to be healthy before starting.

### API image only (MySQL elsewhere)

Build image:

```bash
docker build -t teacher-student-api .
```

Run container:

```bash
docker run -d --name teacher-student-api \
  -p 3000:3000 \
  --env-file .env \
  teacher-student-api
```

If MySQL runs on your host machine, set `DB_HOST` to an address reachable from the container before running (for example, `host.docker.internal` on macOS).

## Testing

Run all tests:

```bash
npm test
```

Integration tests will auto-create `teacher_student_test_db` if it does not exist yet, then truncate only test tables between tests.

Run with coverage:

```bash
npm run test:coverage
```

## Database Utility Commands

```bash
npm run db:migrate:undo
npm run db:migrate:undo:all
npm run db:seed:undo
npm run db:reset
```

## API Endpoints

Base path: `/api`

Health check:

- `GET /` -> verify API process is running

- `POST /register` -> register one or more students to a teacher
- `GET /commonstudents?teacher=<email>&teacher=<email>` -> retrieve common students of teachers
- `POST /suspend` -> suspend a student
- `POST /retrievefornotifications` -> retrieve students to receive notifications

## Notes

- Login/auth is out of scope for this assignment.
- If you deploy the API later, update the **Hosted API** section with the public URL(s).
- Integration tests use a separate database schema (`teacher_student_test_db`) on the same MySQL instance, so they do **not** affect your dev data. They **truncate** rows in `teachers`, `students`, and `teacher_students` between tests (they do **not** drop tables or run `sync({ force: true })`).
