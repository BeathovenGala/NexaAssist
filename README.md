# NexaAssist

**Centralized AI-powered business operations** — one dashboard for scheduling, inventory, an AI assistant, marketing campaigns, WhatsApp messaging, SEO audits, and analytics. Each organization runs in its own secure workspace with role-based access.

## What you get

- **Multi-tenant workspaces** — separate data per business (tenant)
- **Auth & onboarding** — register, staff invites (link + QR), customer join requests
- **Scheduling** — services, availability, appointments, calendar, booking wizard
- **Inventory** — items, stock movements, alerts, restock requests
- **AI assistant** — chat with tool calling (book appointments, inventory, users); optional OpenRouter LLM
- **Campaigns** — create, approve, schedule, and run marketing campaigns with generated assets
- **WhatsApp** — templates, batches, delivery logs (simulated locally without Meta credentials)
- **SEO audit** — crawl sites, score issues, compare scans
- **Analytics** — insights across appointments, inventory, campaigns, chat, and SEO
- **Background jobs** — notifications, emails, reminders, and long-running work via Redis + worker

## Who uses it

| Role | Typical use |
|------|-------------|
| **SUPER_ADMIN** | Platform-wide administration |
| **TENANT_ADMIN** | Organization owner; settings, invites, approvals |
| **DOCTOR** | Clinical staff; appointments and stock consumption |
| **RECEPTIONIST** | Front desk; booking and calendar |
| **INVENTORY_MANAGER** | Stock, alerts, approvals |
| **STAFF** | General operations |
| **CUSTOMER** | Book after joining an organization |

Permissions (e.g. `appointments:read`, `chat:use`, `campaigns:read`) control which dashboard routes and actions appear.

## Architecture

```text
Browser (Next.js dashboard)
        │
        ▼
NestJS API  (/api)  ──►  PostgreSQL
        │
        └── enqueue ──►  Redis (BullMQ) ──►  Background worker
```

- **Frontend** — Next.js App Router, Tailwind, client stores for API data
- **Backend** — NestJS, Prisma, JWT sessions, tenant-scoped queries
- **Worker** — separate process for queues (notifications, campaigns, WhatsApp, SEO, analytics)

Long API calls return quickly; heavy work runs in the worker.

## Prerequisites

- **Node.js** 20+ and **npm**
- **Docker Desktop** (or Docker Engine + Compose) for PostgreSQL and Redis
- Optional: **OpenRouter** API key (smarter chat), **WhatsApp Business** credentials, **S3-compatible** storage for campaign posters

## Install and run (local)

### 1. Start databases

From the **repository root** (where `docker-compose.yml` lives):

```bash
docker compose up -d
```

This starts:

- **PostgreSQL 16** — host port **5433** → container `5432`  
  User / password / database: `nexaassist` / `nexaassist` / `nexaassist`
- **Redis 7** — host port **6379** (required for background jobs)

Check health:

```bash
docker compose ps
```

### 2. Backend environment

Copy variables from [`.env.example`](.env.example) into **`backend/.env`** (gitignored). Minimum:

```env
DATABASE_URL="postgresql://nexaassist:nexaassist@localhost:5433/nexaassist?schema=public"
JWT_ACCESS_SECRET="dev-only-change-me-to-a-long-random-string"
REDIS_URL=redis://localhost:6379
WORKER_ENABLED=true
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
```

See [`.env.example`](.env.example) for chat, campaigns, WhatsApp, S3, SMTP, and rate-limit settings.

**Optional seeding** (set in `backend/.env` before `npm run db:seed`):

| Variable | Purpose |
|----------|---------|
| `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD` | Platform super admin |
| `SEED_DEMO_USERS=true` + `SEED_DEMO_PASSWORD` | Demo tenant with one user per role |

> **Warning:** `npm run db:seed` is **destructive** on a local DB — it wipes app data and reapplies roles. Use only on disposable databases.

### 3. Backend API

```bash
cd backend
npm install
npx prisma migrate dev
npm run db:seed
npm run start:dev
```

API: **`http://localhost:4000`** — routes under **`/api`** (e.g. `GET /api/health`).

### 4. Background worker

In another terminal (Redis must be running):

```bash
cd backend
npm run start:worker:dev
```

Without the worker, the API still works but async jobs (notifications, campaign sends, SEO scans, etc.) stay queued.

### 5. Frontend

Create **`frontend/.env.local`** (gitignored):

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Then:

```bash
cd frontend
npm install
npm run dev
```

App: **`http://localhost:3000`**.

### 6. Verify

1. Open `http://localhost:3000`
2. `curl http://localhost:4000/api/health`

## Feature map (dashboard)

| Area | Routes |
|------|--------|
| Home | `/dashboard` |
| Scheduling | `/dashboard/appointments`, `/calendar`, `/availability`, `/service-types`, `/booking` |
| Operations | `/dashboard/inventory`, `/operations` |
| AI assistant | `/dashboard/assistant` |
| Campaigns | `/dashboard/campaigns`, approvals, detail pages |
| WhatsApp | `/dashboard/whatsapp`, templates, batches, logs |
| SEO | `/dashboard/seo`, projects, scans |
| Analytics | `/dashboard/analytics` (+ appointments, inventory, campaigns, seo, chatbot) |
| Admin | `/dashboard/users`, `/join-requests`, `/notifications` |
| System | `/dashboard/settings`, `/modules` |
| Public | `/join`, `/invite/[token]` |

Menu items appear only when the signed-in user has the right permission.

## Environment variables (overview)

Full list and comments: [`.env.example`](.env.example).

| Section | Examples | Notes |
|---------|----------|--------|
| Database & Redis | `DATABASE_URL`, `REDIS_URL` | Required locally via Docker |
| Auth | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `BCRYPT_ROUNDS` | Use long random secrets in production |
| Chat / AI | `OPENROUTER_API_KEY`, `CHAT_AGENT_MODE`, `CHAT_MAX_AGENT_STEPS` | Rule-based fallback without a key |
| Campaigns | `TOGETHER_API_KEY`, `CAMPAIGNS_POLLINATIONS_FALLBACK` | Image generation for posters |
| Storage | `S3_*` | Optional; stable URLs for campaign assets |
| WhatsApp | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` | Optional; simulated if unset |
| Email | `SMTP_*` | Optional; logs to worker console if unset |
| Rate limits | `THROTTLE_*` | API throttling |

Generate staging secrets: `node scripts/generate-staging-secrets.mjs`

## Staging and production

Hosted stack (documented): **Vercel** (frontend) + **Render** (API + worker) + **Neon** (Postgres) + **Upstash** (Redis).

- Deploy guide: [docs/deploy-staging.md](docs/deploy-staging.md)
- Render blueprint: [render.yaml](render.yaml)

## Documentation

| Document | Description |
|----------|-------------|
| [docs/NEXASSIST-PLATFORM-REPORT.md](docs/NEXASSIST-PLATFORM-REPORT.md) | Full product report (modules, flows, diagrams) |
| [docs/NEXASSIST-PLATFORM-REPORT.html](docs/NEXASSIST-PLATFORM-REPORT.html) | Same report for browser / print-to-PDF |
| [docs/phase-2-3documentation.md](docs/phase-2-3documentation.md) | Invites and scheduling implementation notes |
| [docs/phase-5-manager-brief.md](docs/phase-5-manager-brief.md) | Notifications and background jobs |
| [TEST_PERSONAS.local.md](TEST_PERSONAS.local.md) | Local QA personas (not for production) |
| [backend/README.md](backend/README.md) | Backend-specific notes |

## Day-to-day commands

| Goal | Command |
|------|---------|
| Start databases | `docker compose up -d` (repo root) |
| Stop databases | `docker compose down` |
| Run API | `cd backend && npm run start:dev` |
| Run worker | `cd backend && npm run start:worker:dev` |
| Run web app | `cd frontend && npm run dev` |
| Apply migrations | `cd backend && npx prisma migrate dev` |
| Reseed | `cd backend && npm run db:seed` |
| Backend tests | `cd backend && npm test` |

## Troubleshooting

- **Cannot reach database (`P1001`)** — Docker running? `docker compose ps` healthy? `DATABASE_URL` uses port **5433** on the host.
- **Port in use** — Change `PORT` in `backend/.env` or run Next.js on another port: `npm run dev -- -p 3001`.
- **401 after pulls** — Clear browser localStorage or sign in again.
- **Demo seed fails** — With `SEED_DEMO_USERS=true`, set `SEED_DEMO_PASSWORD` too.
- **Jobs never finish** — Start the worker and confirm `REDIS_URL` matches Docker Redis.
- **Auth modal buttons require double-click** — Fixed: backdrop now uses `onClick` instead of `onMouseDown` for consistent event handling.
- **Intro not showing correctly** — Fixed: children render behind overlay with proper z-index (10000), and pointer events are blocked during animation.

## Project layout

```text
saas/
├── backend/          NestJS API, Prisma, worker entrypoints
├── frontend/         Next.js dashboard and landing
├── docs/             Platform report and phase notes
├── scripts/          Staging helpers (secrets, migrate)
├── docker-compose.yml
├── render.yaml       Render deploy blueprint
└── .env.example      Shared env template (copy to backend/.env)
```

---

*NexaAssist — multi-tenant operations, AI assistant, campaigns, messaging, SEO, and analytics in one platform.*
