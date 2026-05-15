---
name: Phase 2 Auth Shell
overview: "Build the complete authenticated app shell for NexaAssist Phase 2: auth context, role-aware sidebar, tenant settings, invite-based staff onboarding, and a public client entry path. Covers both frontend (Next.js) and backend additions (Invitation model + routes, tenant PATCH)."
todos:
  - id: backend-invite-model
    content: Add Invitation model + InviteStatus enum to Prisma schema, run migration
    status: completed
  - id: backend-invite-module
    content: Create backend/src/invitations/ module with create, validate, accept, resend, revoke routes
    status: completed
  - id: backend-tenant-patch
    content: Add PATCH /api/tenants/:id endpoint to tenants controller + service
    status: completed
  - id: frontend-auth-context
    content: Create frontend/lib/auth.tsx (AuthProvider + useAuth hook), wrap app/layout.tsx
    status: completed
  - id: frontend-dashboard-layout
    content: Rewrite app/dashboard/layout.tsx to use useAuth + render Sidebar
    status: completed
  - id: frontend-sidebar
    content: Create components/dashboard/Sidebar.tsx with role-gated navigation items
    status: completed
  - id: frontend-settings-page
    content: Create app/dashboard/settings/page.tsx (org details, user list, invite form + QR)
    status: completed
  - id: frontend-invite-page
    content: Create app/invite/[token]/page.tsx (public invite accept + auto-login)
    status: completed
  - id: frontend-join-page
    content: Create app/join/page.tsx (public client self-registration placeholder)
    status: completed
isProject: false
---

# Phase 2 — Auth Shell, Role Nav, Tenant Settings & Invite Flow

## What already exists

**Backend (NestJS + Prisma):**
- `POST /api/auth/register/tenant` — creates tenant + first admin account
- `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`
- `GET /api/auth/me` — returns user profile with flattened permissions
- `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id`
- `GET /api/roles`, `GET /api/tenants/:id`
- Roles seeded: `SUPER_ADMIN`, `TENANT_ADMIN`, `DOCTOR`, `INVENTORY_MANAGER`, `RECEPTIONIST`, `STAFF`, `CUSTOMER`

**Frontend (Next.js 15):**
- [`frontend/lib/api.ts`](frontend/lib/api.ts) — Axios client with token refresh interceptor
- `app/auth/login` and `app/auth/register` pages (split-shell design)
- `app/dashboard/layout.tsx` — raw inline auth check (no context)
- `app/dashboard/users/page.tsx` — user list + create user form
- Design system CSS variables + auth component set

---

## What needs to be built

### Backend additions

**1. Invitation model** — add to [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma):
```prisma
model Invitation {
  id            String     @id @default(cuid())
  tenantId      String
  email         String?
  phone         String?
  roleId        String
  tokenHash     String     @unique
  status        InviteStatus @default(PENDING)
  expiresAt     DateTime
  createdById   String
  acceptedAt    DateTime?
  createdAt     DateTime   @default(now())
  tenant        Tenant     @relation(fields: [tenantId], references: [id])
  role          Role       @relation(fields: [roleId], references: [id])
  createdBy     User       @relation(fields: [createdById], references: [id])
}

enum InviteStatus { PENDING ACCEPTED REVOKED EXPIRED }
```

**2. Invitation routes** — new `backend/src/invitations/` module:
- `POST /api/invitations` — create invite, generate token, return invite URL + QR data (`invitations:create`)
- `GET /api/invitations/validate/:token` — public; validate token, return tenant + role info
- `POST /api/invitations/accept` — public; `{ token, name, password }` → create user, assign role, mark accepted
- `POST /api/invitations/:id/resend` — `invitations:create`
- `DELETE /api/invitations/:id` — revoke (`invitations:create`)

**3. Tenant PATCH** — add to `backend/src/tenants/`:
- `PATCH /api/tenants/:id` — update `name`, `slug`, `logoUrl`, etc. (`tenants:update`)

---

### Frontend additions

#### Route structure (final state)

```
app/
├── (public)                 ← landing page group
│   └── page.tsx
├── auth/
│   ├── login/page.tsx       ← existing
│   └── register/page.tsx    ← existing (tenant creation)
├── dashboard/
│   ├── layout.tsx           ← rewrite: sidebar shell + role nav
│   ├── page.tsx             ← use auth context, remove raw fetch
│   ├── users/page.tsx       ← existing, minor cleanup
│   └── settings/
│       └── page.tsx         ← new: org details + user management + invite
├── invite/
│   └── [token]/
│       └── page.tsx         ← public: validate token → set password → join
└── join/
    └── page.tsx             ← public: client self-registration (phone/OTP placeholder)
```

#### Auth context — `frontend/lib/auth.tsx` (new)

Central `AuthProvider` wrapping the entire app. Loads `/auth/me` on mount, exposes `user`, `tenant`, `permissions[]`, `isLoading`, `logout()`. Consumed via `useAuth()` hook. This replaces the inline fetch in every layout.

Key shape:
```ts
type AuthUser = {
  id: string; email: string; name: string; userCode: string;
  roles: string[]; permissions: string[]; tenantId: string;
}
```

- `app/layout.tsx` — wrap `{children}` with `<AuthProvider>`

#### Dashboard layout rewrite — `frontend/app/dashboard/layout.tsx`

Replace the current 103-line inline fetch with:
- `useAuth()` for user/permissions
- Redirect to `/auth/login` if not authenticated
- `<Sidebar>` component (role-aware nav)
- Top bar with user avatar + logout

#### Sidebar component — `frontend/components/dashboard/Sidebar.tsx`

Nav items gated by permission. Role-to-nav mapping:

| Role | Nav items shown |
|---|---|
| `TENANT_ADMIN` | Dashboard, Users, Settings, (placeholders) |
| `DOCTOR` | Dashboard, Appointments (placeholder) |
| `INVENTORY_MANAGER` | Dashboard, Inventory (placeholder) |
| `RECEPTIONIST` | Dashboard, Appointments (placeholder) |
| `CUSTOMER` | Dashboard, Booking (placeholder) |

Gating uses `permissions` array from `/auth/me` (already flattened by backend).

#### Settings page — `frontend/app/dashboard/settings/page.tsx`

Three sections (tabs or stacked cards):
1. **Organization** — display/edit `name`, `slug` via `PATCH /api/tenants/:id`
2. **Users** — user list with role badge + status; move create-user form here
3. **Invite** — invite form (email/phone + role select) → calls `POST /api/invitations` → shows generated link + QR code image (use `qrcode` npm package in browser)

#### Invite acceptance page — `frontend/app/invite/[token]/page.tsx`

Public page:
1. On mount: `GET /api/invitations/validate/:token` — show tenant name + role
2. Form: full name + password
3. On submit: `POST /api/invitations/accept` → auto-login + redirect to `/dashboard`

#### Client entry — `frontend/app/join/page.tsx`

Simplified public signup: phone/email field + tenant context (passed via query param `?t=<tenantSlug>`). For Phase 2 this is a placeholder shell; OTP wiring comes in Phase 6.

---

## Implementation order

1. **Backend: Invitation model + migration + routes** — enables the invite flow end-to-end
2. **Backend: `PATCH /api/tenants/:id`** — needed for settings page
3. **Frontend: `lib/auth.tsx` + wrap `app/layout.tsx`** — foundation for everything else
4. **Frontend: dashboard `layout.tsx` rewrite + `Sidebar.tsx`** — app shell
5. **Frontend: `settings/page.tsx`** — tenant settings + invite form
6. **Frontend: `invite/[token]/page.tsx`** — staff onboarding path
7. **Frontend: `join/page.tsx`** — client entry placeholder

---

## Dependencies to add

- Frontend: `qrcode` + `@types/qrcode` — browser QR code rendering for invite links
- No new backend deps required (token hashing uses existing `bcrypt` + `crypto`)
