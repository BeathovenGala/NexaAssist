# Backend

This folder contains the NestJS API, Prisma schema, and the BullMQ worker that handles notifications, campaigns, SEO, WhatsApp, analytics, and other background jobs.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example env file:

```bash
copy .env.example .env
```

3. Start the local infrastructure from the repository root if it is not already running:

```bash
docker compose up -d
```

4. Apply the schema and seed local demo data if needed:

```bash
npx prisma migrate dev
npm run db:seed
```

## Environment

The backend reads the following groups of variables:

- Core runtime: `PORT`, `NODE_ENV`, `WORKER_ENABLED`, `FRONTEND_ORIGIN`, `REDIS_URL`
- Database: `DATABASE_URL`
- Auth and throttling: `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_MINUTES`, `BCRYPT_ROUNDS`, `REFRESH_TOKEN_TTL_DAYS`, `THROTTLE_TTL_MS`, `THROTTLE_LIMIT`
- AI and campaigns: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `CAMPAIGNS_OPENROUTER_MODEL`, `CAMPAIGNS_OPENROUTER_IMAGE_MODEL`, `CAMPAIGNS_POLLINATIONS_FALLBACK`, `TOGETHER_API_KEY`, `TOGETHER_IMAGE_MODEL`
- Storage: `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_REGION`, `S3_PUBLIC_BASE_URL`
- Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- WhatsApp: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION`
- Demo seeding: `SEED_DEMO_USERS`, `SEED_DEMO_PASSWORD`, `SEED_DEMO_ADMIN_EMAIL`, `SEED_DEMO_TENANT_NAME`, `SEED_DEMO_TENANT_SLUG`, `SEED_DEMO_TENANT_BUSINESS_TYPE`, and the role-specific demo emails

See [.env.example](.env.example) for the default values.

## Run

API in development mode:

```bash
npm run start:dev
```

Worker in development mode:

```bash
npm run start:worker:dev
```

The API listens on `http://localhost:4000` and mounts routes under `/api`.

## Terminal Plan

| Terminal | Command | What it does |
|----------|---------|--------------|
| 1 | `docker compose up -d` | Starts PostgreSQL and Redis |
| 2 | `npm run start:dev` | Runs the HTTP API |
| 3 | `npm run start:worker:dev` | Runs the background worker |

If you only need the API, you can skip the worker terminal. Queue-backed features will remain pending until the worker is running.

## Common Commands

| Goal | Command |
|------|---------|
| Run API | `npm run start:dev` |
| Run worker | `npm run start:worker:dev` |
| Build production bundle | `npm run build` |
| Start production bundle | `npm run start:prod` |
| Run unit tests | `npm run test` |
| Run e2e tests | `npm run test:e2e` |
| Run coverage | `npm run test:cov` |
| Format code | `npm run format` |
| Lint code | `npm run lint` |
| Generate Prisma client | `npm run prisma:generate` |
| Apply Prisma migrations | `npm run prisma:migrate` |
| Push Prisma schema | `npm run db:push` |
| Seed local data | `npm run db:seed` |

## Notes

- `npm run db:seed` is destructive on the local database.
- If you want a quieter dev log, keep `DISABLE_PINO_PRETTY=1` in the backend env.
- The worker depends on Redis; if jobs are not processing, check `REDIS_URL` first.
