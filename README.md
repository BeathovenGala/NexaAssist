# NexaAssist

Multi-tenant SaaS platform — auth, tenancy, RBAC, scheduling, inventory, and secure APIs.

## Prerequisites

- **Node.js** 20+ and **npm**
- **Docker Desktop** (or Docker Engine + Compose) for PostgreSQL (and Redis for future use)

## Run the project (local)

### 1. Start databases

From the **repository root** (where `docker-compose.yml` lives):

```bash
docker compose up -d
```

This starts:

- **PostgreSQL 16** — host port **5433** → container `5432` (avoids clashing with a local Postgres on 5432)  
  User / password / database: `nexaassist` / `nexaassist` / `nexaassist`
- **Redis 7** — host port **6379** (required for background jobs / notifications)

Wait until the DB is healthy (first run may take a few seconds). Check with:

```bash
docker compose ps
```

### 2. Backend environment

Create **`backend/.env`** (this file is gitignored). Minimum content:

```env
# Required — must match Docker Postgres (port 5433 on host)
DATABASE_URL="postgresql://nexaassist:nexaassist@localhost:5433/nexaassist?schema=public"

# Required — use long random strings in real deployments
JWT_ACCESS_SECRET="dev-only-change-me-to-a-long-random-string"

# Optional (defaults shown)
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
JWT_ACCESS_EXPIRES_MINUTES=15
BCRYPT_ROUNDS=12
REFRESH_TOKEN_TTL_DAYS=7
INVITE_TOKEN_TTL_DAYS=7

# Phase 5 — queues & notifications (required for async jobs)
REDIS_URL=redis://localhost:6379
WORKER_ENABLED=true

# Optional email (SMTP); if omitted, emails log to the worker console
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM=noreply@yourdomain.com
```

**Optional seeding** (edit `backend/.env` before you run `npm run db:seed`):

| Variable | Purpose |
|----------|---------|
| `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD` | Creates platform `SUPER_ADMIN` (`userCode` e.g. `SA-NEXA-001`). |
| `SEED_DEMO_USERS=true` + `SEED_DEMO_PASSWORD` | Creates a demo tenant and one user per role for local QA (see `backend/prisma/seed-demo.ts`). |
| `SEED_DEMO_TENANT_NAME`, `SEED_DEMO_*_EMAIL`, … | Override demo tenant name and demo user emails — see `backend/prisma/seed-demo.ts`. |

> **Warning:** `npm run db:seed` is **destructive** — it wipes app data (users, tenants, appointments, inventory rows, etc.) and reapplies roles/permissions. Only use on a disposable local database.

### 3. Install and migrate the backend

```bash
cd backend
npm install
npx prisma migrate dev
npm run db:seed
npm run start:dev
```

Leave this terminal open. API base URL: **`http://localhost:4000`**, routes under **`/api`** (e.g. `GET http://localhost:4000/api/health`).

### 3b. Background worker (Phase 5)

Open a **third** terminal (Redis must be running via Docker):

```bash
cd backend
npm run start:worker:dev
```

This process handles notifications, emails, reminders, and inventory alerts. Without it, API requests still succeed but async jobs stay queued.

### 4. Frontend environment

Create **`frontend/.env.local`** (gitignored):

```env
# Optional — defaults to http://localhost:4000 if omitted
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 5. Install and run the frontend

Open a **second** terminal:

```bash
cd frontend
npm install
npm run dev
```

App URL: **`http://localhost:3000`**.

### 6. Quick verification

1. Browser: open `http://localhost:3000`
2. API: `curl http://localhost:4000/api/health` (or use the browser / Postman)

---

## Day-to-day commands

| Goal | Command |
|------|---------|
| Start databases | `docker compose up -d` (from repo root) |
| Stop databases | `docker compose down` |
| Run API (watch mode) | `cd backend && npm run start:dev` |
| Run background worker | `cd backend && npm run start:worker:dev` |
| Run web app | `cd frontend && npm run dev` |
| Reset DB schema + rerun migrations | `cd backend && npx prisma migrate dev` |
| Reseed roles + optional users | `cd backend && npm run db:seed` |

---

## Troubleshooting

- **`P1001` / cannot reach database** — Ensure Docker is running and `docker compose ps` shows Postgres healthy; confirm `DATABASE_URL` uses port **5433**.
- **Port 4000 or 3000 in use** — Set `PORT` in `backend/.env` or stop the other process; for Next.js use `npm run dev -- -p 3001` (and point `FRONTEND_ORIGIN` / bookmarks accordingly).
- **401 / Invalid session after code changes** — Clear site localStorage tokens or log in again.
- **Seed errors with `SEED_DEMO_USERS=true`** — You must set **`SEED_DEMO_PASSWORD`** as well.

---

## Project layout

- `backend/` — NestJS + Prisma + PostgreSQL
- `frontend/` — Next.js + Tailwind
- `docker-compose.yml` — Local Postgres + Redis
