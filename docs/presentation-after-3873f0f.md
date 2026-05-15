# What we built after Phase 1 (commit `3873f0f`)

**Baseline:** multi-tenant auth, users/tenants/roles, JWT + rotating refresh, RBAC guards, Next.js auth + dashboard shell, Prisma core models (no appointments yet).

**This document:** everything added **after** commit `3873f0f95d6566850b9e73479376ed02cb9da161` — in plain language, with tiny code hints you can show on slides.

---

## 1. Already on `main` (commit `64a54ef`)

*Commit message:* `phase2/invite link customers ps dashboard ui`  
*Scope:* mostly **backend** — invitations + tenant updates + auth hook for “accept invite → logged in”.

### Invitations (staff onboarding)

We store an **invitation** per pending user: tenant, optional email/phone, role, **hashed** invite token, expiry, status (`PENDING` → `ACCEPTED` / `REVOKED` / `EXPIRED`).

```prisma
model Invitation {
  tokenHash   String       @unique   // only SHA-256 of the secret token
  status      InviteStatus @default(PENDING)
  expiresAt   DateTime
  // …tenant, role, createdBy, email/phone
}
```

**Public endpoints** (no login): validate token, accept invite (creates user + marks invite used, returns tokens).

```http
GET  /api/invitations/validate/:token
POST /api/invitations/accept
```

**Admin endpoints** (JWT + permissions): create invite, list invites, resend (new token), revoke.

```http
POST   /api/invitations
GET    /api/invitations
POST   /api/invitations/:id/resend
DELETE /api/invitations/:id
```

**DTO sketch** — invite by email or phone, pick a role:

```ts
// CreateInvitationDto (trimmed)
{ tenantId?: string; email?: string; phone?: string; role: RoleName }
```

**Security in words:** the browser link carries a **random token**; the database keeps **SHA-256(token)** only (same idea as refresh tokens). Resend rotates the secret and extends expiry.

### Auth: one place to “mint” a session after signup

Accept-invite reuses the same token pipeline as login by calling a small helper on `AuthService`:

```ts
// After user row is created in a transaction:
const session = await this.auth.createSessionForUser(user.id);
return session; // access + refresh, same shape as login
```

### Tenants: org can be edited

Admins can **PATCH** their organization (name, slug, branding fields — whatever `UpdateTenantDto` exposes), guarded by `tenants:update` and tenant scope.

```http
PATCH /api/tenants/:id
```

### Small utilities

- `generateInvitationToken()` — random opaque bytes for the invite link.  
- `hashToken(raw)` — SHA-256 for storage and lookup.

### Database & seed

- Migration `20260515120000_invitations` adds the `Invitation` table + `InviteStatus` enum.  
- Seed gains **`invitations:create`** / **`invitations:read`** (and any related wiring) so tenant admins can use the feature.

---

## 2. On your machine / branch (not necessarily pushed yet)

Your **current workspace** goes further than that single commit: extra migrations, modules, and UI paths exist locally (see `git status`). Treat this as **“demo-ready / in progress”** until it is committed and deployed.

### Appointment & calendar stack (backend)

Four Nest modules wired in `AppModule`:

| Module | In one sentence |
| --- | --- |
| **ServiceTypes** | Catalog of services (name, duration, color, active flag). |
| **Availability** | Staff schedules: slots, recurring rules, blocked time; **free-slots** for booking. |
| **Appointments** | Create/list/cancel/reschedule/complete; **overlap check** so the same staff is not double-booked for `PENDING`/`CONFIRMED`. |
| **Calendar** | Day / week / month views aggregating appointments + availability + blocks. |

**Overlap idea** (the important line for a slide):

```ts
// same staff, overlapping window, active statuses → conflict
startTime: { lt: end }, endTime: { gt: start }
```

### Join requests (customer path)

Public-ish flow: a user submits interest in a tenant by **slug**; admins **approve** or **reject** (`JoinRequestsModule`, permissions like `join-requests:create` / `join-requests:manage`). Bridges “I found this clinic online” → “account pending approval.”

### Tenants discovery

`GET /api/tenants/public` lists active tenants so the **join** or **signup** UI can show a clinic picker without an admin token.

### Frontend (local files)

Paths that exist in the repo folder but may still be **untracked** in git — worth showing in a demo:

- **`/invite/[token]`** — read-only validate + form → accept → tokens stored like login.  
- **`/dashboard/settings`** — org + users + **invite link / QR** (QR encodes the same URL the API returns).  
- **`/join`** — client entry (often `?t=<tenantSlug>`); pairs with join-requests / public tenants when wired end-to-end.

---

## 3. Three ways to get a user in (story for stakeholders)

| Path | Who | What happens |
| --- | --- | --- |
| **1. Email invite** | Admin | Creates invite → share link (or QR) → new user sets password → **session returned**, lands in dashboard. |
| **2. Phone invite** | Admin | Same API; phone stored on invite; email may be collected at accept if needed. |
| **3. Self-serve join** | Customer | Finds tenant (slug / public list) → **join** page → join-request or signup flow (depending on how far the UI is connected). |

---

## 4. One-slide “before vs after”

| Before `3873f0f` | After |
| --- | --- |
| Register org + first admin only | **Invite** additional staff with roles + expiring links |
| Read tenant | **Update** tenant from settings |
| Login / refresh / me | **Accept invite** returns the **same token pair** as login |
| No appointment data | **Service types, availability, appointments, calendar** (local branch) |
| No client onboarding API | **Join requests** + **public tenants** (local branch) |

---

## 5. Env knobs (mention only if asked)

| Variable | Role |
| --- | --- |
| `FRONTEND_ORIGIN` | Base URL pasted into `inviteUrl` returned by the API |
| `INVITE_TOKEN_TTL_DAYS` | How long an invite stays valid (default commonly ~7 days) |

---

## 6. How to say it in 30 seconds

> *“On top of Phase 1 auth, we added **invitations**: admins generate a secure link, new staff complete signup, and we log them in immediately. We added **tenant PATCH** for settings. Locally we’re extending into **scheduling**: services, availability, appointments with double-booking protection, calendar views, and a **join-request** path for customers choosing a tenant.”*

---

*Generated for presentation use. For exact file lists on your machine, run `git log 3873f0f..HEAD --oneline` and `git diff 3873f0f..HEAD --stat`.*
