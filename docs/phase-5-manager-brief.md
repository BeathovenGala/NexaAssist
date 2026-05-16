# NexaAssist — Phase 5: Notifications & Background Operations

**Audience:** Engineering leadership, product, operations  
**Status:** Implemented (local/dev ready)  
**Date:** May 2026  

---

## Executive summary

Phase 5 turns NexaAssist from a **request/response dashboard** into an **operational SaaS platform**. User actions (booking an appointment, low stock, inventory requests) now trigger **background processing** and **in-app notifications** without slowing down the UI.

Heavy work (emails, alerts, reminders) runs **after** the API responds, using **Redis + BullMQ** workers. Every tenant’s data stays isolated end-to-end.

---

## Why this phase matters

| Before Phase 5 | After Phase 5 |
|----------------|---------------|
| API did everything synchronously (slow, fragile) | API enqueues jobs and returns immediately |
| No unified notification experience | In-app notification center + header bell |
| Doctor “confirm” was a generic status edit | Explicit **Accept / Decline** workflow with customer-facing status |
| Past dates could be booked via API/UI gaps | **Future-only** booking enforced server-side |
| Inventory alerts lived only on an alerts page | Managers get **notifications** for low stock and restock requests |
| No visibility into background failures | **Operations dashboard** for queue health and job retry |

**Business outcome:** Faster UX, clearer appointment approval flow, proactive inventory awareness, and a foundation for email, SMS, and automation later.

---

## What users see (product features)

### 1. Appointment booking & approval

- **Customer** books → status **“Request sent”** (pending, amber on calendar).
- **Doctor/staff** receives an in-app notification → **Accept** or **Decline**.
- **Accept** → **“Booking confirmed”** (green on calendar) + customer notification.
- **Decline** → **“Declined by provider”** + customer notification.
- Booking UI only allows **today and future dates**; appointments list defaults to **Today** (with option for all dates).

### 2. Notification center

- **Bell icon** in the dashboard header with unread count (polls every 30 seconds).
- **Notifications page** with filters: All, Unread, Critical, Appointments, Inventory, System.
- Each notification can include an **action link** (e.g. open appointment or inventory item).

### 3. Inventory (extended)

- **All roles with access** (including customers) can **search** the catalog and **request restock** when items are low or out of stock.
- **Managers** receive notifications when stock is low/out or when someone submits a request.
- **Inventory staff / managers** retain ability to **add items** (unchanged, permission-gated).

### 4. Operations dashboard (admins)

- Queue backlog and failure counts per queue.
- Worker online/offline indicator.
- List of **failed jobs** with **Retry** for recovery.

---

## Technical architecture (high level)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Web app    │────▶│  NestJS API  │────▶│ PostgreSQL  │
│  (Next.js)  │     │              │     │ (persistent)│
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                           │ enqueue jobs
                           ▼
                    ┌──────────────┐
                    │    Redis     │
                    │   (queues)   │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Workers    │──▶ In-app notifications
                    │  (BullMQ)    │──▶ Email (SMTP or dev log)
                    └──────────────┘──▶ Reminders & cleanup
```

### Domain queues (isolated workloads)

| Queue | Purpose |
|-------|---------|
| `notifications` | Create in-app notification records |
| `emails` | Send templated email (SMTP when configured) |
| `appointments` | Schedule and send appointment reminders |
| `inventory` | Notify managers on alerts and requests |
| `system` | Scheduled cleanup and reminder scans |

**Design principles:**

- **Event-driven:** Domain events (e.g. `appointment.created`) enqueue jobs; controllers stay thin.
- **Retries:** Exponential backoff (5s → 30s → 2m → 10m), up to 5 attempts; failed jobs retained for ops review.
- **Idempotency:** Dedupe keys prevent duplicate notifications/emails on retry.
- **Multi-tenant safety:** Every job carries `tenantId`; DB queries always scope by tenant + user.

---

## Security & compliance notes

- Notifications are visible only to the **authenticated user** within their **tenant**.
- Cross-tenant leakage is prevented at the API, service, and worker layers.
- Email uses optional SMTP; without credentials, content is logged in the worker (dev-friendly, no accidental sends).
- New permissions: `notifications:read`, `operations:read` (admin/ops roles).

---

## Infrastructure requirements

| Component | Role | Local default |
|-----------|------|----------------|
| PostgreSQL | Business data | Docker port **5433** |
| Redis | Job queues | Docker port **6379** |
| API process | HTTP + enqueue jobs | `npm run start:dev` |
| Worker process | Process background jobs | `npm run start:worker:dev` |

**Important:** The worker must run in every environment where notifications and emails should deliver. If only the API runs, jobs accumulate in Redis but nothing processes them.

Optional: **SMTP** environment variables for real email in staging/production.

---

## How to run locally (demo checklist)

1. `docker compose up -d` (Postgres + Redis)
2. Configure `backend/.env` with `DATABASE_URL`, `JWT_ACCESS_SECRET`, `REDIS_URL`
3. `cd backend && npx prisma migrate dev && npm run db:seed` *(seed updates permissions)*
4. Terminal A: `npm run start:dev` (API)
5. Terminal B: `npm run start:worker:dev` (background worker)
6. Terminal C: `cd frontend && npm run dev` (UI)

**Suggested demo script:**

1. Log in as **customer** → book appointment → see “Request sent”.
2. Log in as **doctor** → see bell notification → **Accept** → customer sees “Booking confirmed”.
3. Log in as **customer** with inventory access → open out-of-stock item → **Request item**.
4. Log in as **inventory manager** → see request notification.
5. Log in as **admin** → open **Operations** → confirm queues healthy and worker online.

---

## Deliverables summary

| Area | Delivered |
|------|-----------|
| Background jobs | Redis, BullMQ, 5 domain queues, dedicated worker entrypoint |
| In-app notifications | DB model, API, bell, notification center page |
| Email | Template registry, SMTP + console fallback |
| Appointments | Confirm/reject APIs, REJECTED status, future-only booking |
| Inventory | Customer read/request permissions, manager notifications |
| Operations | Health API + dashboard, failed job retry |
| Scheduling | Cron for reminder scan and notification archival |

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Worker not deployed | Operations dashboard shows worker offline; README documents required process |
| Redis unavailable | Jobs cannot enqueue; monitor Redis in production |
| Email misconfiguration | Console fallback in dev; dedupe prevents duplicate sends on retry |
| Permission drift after deploy | Run `npm run db:seed` on dev DB or migration script for prod role permissions |

---

## Recommended next steps (post–Phase 5)

1. **Production deployment:** Run API + worker as separate services/containers; managed Redis.
2. **SMTP:** Configure provider (SendGrid, SES, etc.) for staging/production.
3. **Monitoring:** Alert on queue depth, failed job rate, worker heartbeat.
4. **WebSockets (optional):** Replace 30s polling for real-time bell updates.
5. **User notification preferences:** Email on/off per event type.

---

## Reference

- Developer setup: [README.md](../README.md)
- Scheduling/inventory prior phases: [phase-2-3documentation.md](./phase-2-3documentation.md)
- Implementation plan (internal): `.cursor/plans/phase_5_infrastructure_55478d5c.plan.md`

---

*For technical deep-dives, contact the engineering team with this document and the Phase 5 pull request / branch.*
