# Temporary test personas (local only)

**Delete this file before any production deploy or public repo share.**

**Automated path:** set `SEED_DEMO_USERS=true` and `SEED_DEMO_PASSWORD` in `backend/.env`, then run `npm run db:seed` — see `backend/prisma/seed-demo.ts` and the root `README.md` for default emails. Super admin still uses `SEED_SUPER_ADMIN_*` when set.

The tables below describe those defaults and optional manual registration if you prefer not to use demo seed.

---

## How to read this doc

| Column | Meaning |
|--------|---------|
| **Role** | `RoleName` in Prisma (`SUPER_ADMIN`, `TENANT_ADMIN`, …). |
| **Email** | Login email (`POST /api/auth/login` or app sign-in). |
| **Password** | Plain text password to set at registration, invite accept, or user create. |
| **User id** | PostgreSQL `User.id` (UUID). Assigned at insert — **not** fixed. After creating the user, copy from DB or API response (e.g. `user.id` on register). |
| **userCode** | Human-readable code from seed or `UserCodeService` (e.g. `SA-NEXA-001`, `TA-DEMOCLINIC-001`). First tenant admin for slug `demo-clinic` is sequence `001`. |
| **tenantId** | `null` for platform super admin and unaffiliated customers; otherwise the tenant UUID. |

**Quick SQL after seeding/creating users** (psql, Prisma Studio, or any client):

```sql
SELECT id AS "userId", "userCode", email, "tenantId", status
FROM "User"
ORDER BY email;
```

---

## 1. Platform super admin (seeded)

Created only when `backend/.env` defines both variables **before** `npm run db:seed`:

- `SEED_SUPER_ADMIN_EMAIL`
- `SEED_SUPER_ADMIN_PASSWORD`

| Role | Email | Password | User id | userCode | tenantId | Notes |
|------|-------|----------|---------|----------|----------|--------|
| `SUPER_ADMIN` | *(your `SEED_SUPER_ADMIN_EMAIL`)* | *(your `SEED_SUPER_ADMIN_PASSWORD`)* | *(UUID after seed)* | `SA-NEXA-001` | `null` | Wipes with seed; re-seed regenerates id if user recreated. |

**Suggested local values** (set in `backend/.env`, then run seed):

- Email: `superadmin.nexa.local@test`
- Password: `Temp_SuperAdmin_2026!`

---

## 2. Demo tenant (optional — created by seed when `SEED_DEMO_USERS=true`)

Default tenant name: `Demo Medical Group` → slug `demo-medical-group` → `userCode` slug part `DEMOMEDICALGROUP` (unless the slug collides and gets a numeric suffix).

| Role | Default email (override via `SEED_DEMO_*_EMAIL`) | Password | userCode (first user per prefix) | Notes |
|------|-----------------------------------------------|----------|-----------------------------------|--------|
| `TENANT_ADMIN` | `tenantadmin.demo@seed.local` | `SEED_DEMO_PASSWORD` | `TA-DEMOMEDICALGROUP-001` | Dana Admin |
| `DOCTOR` | `dr.rivera.demo@seed.local` | same | `DR-DEMOMEDICALGROUP-001` | Alex Rivera |
| `INVENTORY_MANAGER` | `im.chen.demo@seed.local` | same | `IM-DEMOMEDICALGROUP-001` | Morgan Chen |
| `RECEPTIONIST` | `rc.morgan.demo@seed.local` | same | `RC-DEMOMEDICALGROUP-001` | Riley Morgan |
| `STAFF` | `st.jordan.demo@seed.local` | same | `ST-DEMOMEDICALGROUP-001` | Jordan Lee |
| `CUSTOMER` (in-tenant) | `patient.lee.demo@seed.local` | same | `CU-DEMOMEDICALGROUP-001` | Pat Lee |

Slug segment in `userCode` is `formatTenantSlugPart(slug)`: alphanumeric only, uppercase, max 16 chars (see `backend/src/common/utils/slug.util.ts`).

---

## 3. Manual-only staff personas (if you skip demo seed)

Use tenant registration first, then invite or create users. Example emails (use your own passwords):

| Role | Example email | userCode (pattern) |
|------|---------------|-------------------|
| `DOCTOR` | `dr.rivera.demo@test` | `DR-<TENANTSLUGPART>-001` |
| `INVENTORY_MANAGER` | `im.chen.demo@test` | `IM-<TENANTSLUGPART>-001` |
| `RECEPTIONIST` | `rc.morgan.demo@test` | `RC-<TENANTSLUGPART>-001` |
| `STAFF` | `st.jordan.demo@test` | `ST-<TENANTSLUGPART>-001` |
| `CUSTOMER` (in-tenant) | `patient.lee.demo@test` | `CU-<TENANTSLUGPART>-001` |

Replace `<TENANTSLUGPART>` with the uppercase alphanumeric slug part for your tenant.

---

## 4. Customer without tenant

| Role | Default (demo seed) | Password | userCode | Notes |
|------|---------------------|----------|----------|--------|
| `CUSTOMER` | `customer.unaffiliated@seed.local` | `SEED_DEMO_PASSWORD` | `CU-INV-001` | Sam Solo; first unaffiliated customer code in seed. |

If you register manually instead: `customer.unaffiliated@test` via `registerCustomer` — `CU-INV-00x`, `tenantId` null.

---

## 5. Role → permission summary (for test planning)

Reference only — full matrix is `rolePermissionMap` in `backend/prisma/seed.ts`.

- **SUPER_ADMIN** — all permissions.
- **TENANT_ADMIN** — full tenant admin surface (users, tenant, invites, appointments, inventory incl. approve, join-requests manage, etc.).
- **DOCTOR** — clinical/scheduling + limited inventory (read, request, consume) + portal.
- **INVENTORY_MANAGER** — inventory-focused + calendar read + service-types read.
- **RECEPTIONIST** — appointments + availability + service-types write + inventory read/request.
- **STAFF** — similar to doctor minus `portal:access` in seed map; check seed for exact diff.
- **CUSTOMER** — portal, own appointments, availability read, join-requests create.

---

## 6. Checklist

1. Set `SEED_SUPER_ADMIN_*` (optional) and `SEED_DEMO_USERS=true` + `SEED_DEMO_PASSWORD` (optional) in `backend/.env`.
2. Run `npm run db:seed` from `backend/` (destructive).
3. Run the SQL in section 1 and paste real UUIDs below if you want a sticky cheat sheet:

```
SUPER_ADMIN_USER_ID=
TENANT_ID=
TENANT_ADMIN_USER_ID=
DR_USER_ID=
IM_USER_ID=
RC_USER_ID=
ST_USER_ID=
CU_TENANT_USER_ID=
CU_UNAFFILIATED_USER_ID=
```

---

*Generated for NexaAssist local QA. Remove this file when no longer needed.*
