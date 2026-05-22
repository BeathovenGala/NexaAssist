# Deploy NexaAssist (staging / demo)

Stack: **Vercel** (frontend) + **Render** (API + worker) + **Neon** (Postgres) + **Upstash** (Redis).

Replace placeholder URLs with your real domains before going live.

---

## 1. Generate secrets

From the repo root:

```bash
node scripts/generate-staging-secrets.mjs
```

Copy output into your hosting provider’s environment (never commit real secrets).

---

## 2. Neon (Postgres)

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string → `DATABASE_URL`.
3. From your machine (with `DATABASE_URL` set):

```bash
cd backend
npm install
npx prisma migrate deploy
```

**Seeding:** `npm run db:seed` wipes data. For staging, run once on an empty DB, or use demo seed vars documented in [README.md](../README.md).

Optional script (requires `DATABASE_URL` in env):

```bash
./scripts/staging-migrate.sh
```

---

## 3. Upstash (Redis)

1. Create a Redis database at [upstash.com](https://upstash.com).
2. Copy the TLS URL → `REDIS_URL` (e.g. `rediss://default:...@....upstash.io:6379`).

Queues and the worker **require** Redis.

---

## 4. Render — API service

1. New **Web Service** → connect this repo.
2. **Root directory:** `backend`
3. **Build command:** `npm ci && npx prisma generate && npm run build`
4. **Start command:** `npx prisma migrate deploy && npm run start:prod`
5. **Health check path:** `/api/health`

### Required environment variables

| Variable | Example / notes |
|----------|-----------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon connection string |
| `REDIS_URL` | Upstash URL |
| `JWT_ACCESS_SECRET` | From `generate-staging-secrets.mjs` |
| `FRONTEND_ORIGIN` | `https://your-app.vercel.app` |
| `WORKER_ENABLED` | `true` |
| `PORT` | Render sets automatically; optional `4000` |

Optional: `OPENROUTER_API_KEY`, `SMTP_*`, `CAMPAIGNS_POLLINATIONS_FALLBACK=false` for staging.

Note the public API URL (e.g. `https://nexaassist-api.onrender.com`).

---

## 5. Render — Worker service

Duplicate the API service or add a second service in the same Blueprint:

- **Start command:** `npx prisma migrate deploy && npm run start:worker`
- Same env vars as API (especially `DATABASE_URL`, `REDIS_URL`, `WORKER_ENABLED=true`)
- No HTTP health check required; verify via dashboard **Operations** → worker online

Or use the root [`render.yaml`](../render.yaml) Blueprint (two services).

---

## 6. Vercel (frontend)

1. Import repo; set **Root Directory** to `frontend`.
2. Framework: Next.js (auto-detected).
3. Environment:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | Render API URL (no trailing slash) |

4. Deploy. Set backend `FRONTEND_ORIGIN` to the Vercel URL (including `https://`).

[`frontend/vercel.json`](../frontend/vercel.json) pins the build/install commands.

---

## 7. Smoke test

1. `curl https://YOUR-API.onrender.com/api/health` → `success: true`, `checks.database` and `checks.redis` are `ok`.
2. Open Vercel URL → register or log in (after seed).
3. Book an appointment → check notification bell (worker must be running).

---

## Docker (optional)

Build from repo root:

```bash
docker build -f backend/Dockerfile -t nexaassist-api ./backend
docker run --env-file backend/.env -p 4000:4000 nexaassist-api
```

Worker: same image, command `node dist/worker.main`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Health `503` / degraded | Check `DATABASE_URL` and `REDIS_URL`; run `migrate deploy` |
| CORS errors | `FRONTEND_ORIGIN` must exactly match the browser origin |
| Jobs never run | Deploy worker service; Redis reachable from worker |
| Worker offline in Operations | Worker not running or heartbeat key missing |

See [README.md](../README.md) for local development.
