# NexaAssist

NexaAssist is a multi-tenant business operations platform with scheduling, inventory, chat, campaigns, WhatsApp, SEO, and analytics. The stack is split into a Next.js frontend, a NestJS API, and a separate worker for background jobs.

## Project Map

- [backend/README.md](backend/README.md) for API, worker, Prisma, and seed notes.
- [frontend/README.md](frontend/README.md) for the Next.js app, public env, and UI commands.
- [.env.example](.env.example) for the shared local variables.

## What Runs Where

| Part | Path | Local port | Purpose |
|------|------|------------|---------|
| Frontend | `frontend/` | `3001` | Next.js dashboard and landing page |
| Backend API | `backend/` | `4000` | NestJS API under `/api` |
| Worker | `backend/` | n/a | BullMQ processors for async jobs |
| Database | Docker | `5433` | PostgreSQL 16 |
| Queue | Docker | `6379` | Redis 7 |

## Local Setup

1. Start infrastructure from the repository root:

```bash
docker compose up -d
```

2. Install and configure the backend:

```bash
cd backend
npm install
copy .env.example .env
npx prisma migrate dev
npm run db:seed
npm run start:dev
```

3. Start the worker in a second backend terminal:

```bash
cd backend
npm run start:worker:dev
```

4. Install and run the frontend:

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

5. Open the apps:

- Frontend: http://localhost:3001
- API: http://localhost:4000/api/health

## Terminal Plan

| Terminal | Command | Why it exists |
|----------|---------|---------------|
| 1 | `docker compose up -d` | Keeps PostgreSQL and Redis running |
| 2 | `cd backend && npm run start:dev` | Serves the API |
| 3 | `cd backend && npm run start:worker:dev` | Processes notifications, campaigns, SEO, WhatsApp, and analytics jobs |
| 4 | `cd frontend && npm run dev` | Serves the web app |

If you only want to inspect the UI, you still need the API running for most features.

## Useful Commands

| Goal | Command |
|------|---------|
| Start infrastructure | `docker compose up -d` |
| Stop infrastructure | `docker compose down` |
| Check containers | `docker compose ps` |
| Run backend tests | `cd backend && npm test` |
| Run backend e2e tests | `cd backend && npm run test:e2e` |
| Run frontend lint | `cd frontend && npm run lint` |
| Build frontend | `cd frontend && npm run build` |
| Build backend | `cd backend && npm run build` |
| Regenerate Prisma client | `cd backend && npm run prisma:generate` |
| Reseed local data | `cd backend && npm run db:seed` |

## Environment Files

- `backend/.env` is for the NestJS API and worker.
- `frontend/.env.local` is for the Next.js app.
- `.env.example` is the shared reference for the main local variables.

The default local ports are already wired into the examples:

- PostgreSQL on `5433`
- Redis on `6379`
- API on `4000`
- Frontend on `3001`

## Notes

- Demo login uses the seeded demo account and expects `NEXT_PUBLIC_DEMO_PASSWORD` in the frontend env.
- The backend worker is optional for basic API calls, but it is required for queues, reminders, campaign jobs, and SEO work.
- `npm run db:seed` is destructive on a local database, so only run it against disposable data.
