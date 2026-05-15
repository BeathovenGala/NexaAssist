# NexaAssist — Phase 2 & 3 Implementation Guide

> **Date:** May 15, 2026  
> **Scope:** Staff onboarding (invite flows + QR code) · Appointment & Calendar booking system  
> **Stack:** NestJS backend · Next.js 15 frontend · PostgreSQL via Prisma ORM

---

## Table of Contents

1. [Phase 2 — Auth Shell & Staff Invite Flows](#phase-2)
   - [Three Invite Paths](#three-invite-paths)
   - [QR Code Invite](#qr-code-invite)
   - [Backend: Invitation Module](#backend-invitation-module)
   - [Frontend Pages](#phase-2-frontend-pages)
2. [Phase 3 — Appointment & Calendar System](#phase-3)
   - [Database Schema](#database-schema)
   - [Backend Modules](#backend-modules)
   - [API Reference](#api-reference)
   - [Frontend Pages & Components](#frontend-pages--components)
3. [Permission Matrix](#permission-matrix)
4. [Data Flow Diagrams](#data-flow-diagrams)

---

## Phase 2 — Auth Shell & Staff Invite Flows {#phase-2}

### Three Invite Paths

NexaAssist supports three distinct paths for bringing users into a tenant workspace.

---

#### Path 1 — Email Invite Link (Staff Onboarding)

The most common path for inviting doctors, receptionists, and other staff members.

**How it works:**

1. A `TENANT_ADMIN` opens **Dashboard → Settings → Invite** tab.
2. They enter the invitee's email address and select a role from the dropdown.
3. The frontend calls `POST /api/invitations` with `{ email, role }`.
4. The backend generates a cryptographically random token (`crypto.randomBytes(32)`), hashes it with SHA-256 (`hashToken`), stores the hash, and returns:
   - `inviteUrl` — `https://<frontend-origin>/invite/<rawToken>`
   - `token` — raw token (for QR generation)
   - invitation metadata (id, role, expiresAt)
5. The admin copies the link or scans/shares the QR code (see below).
6. The invitee opens the link → hits the public `/invite/[token]` page which calls `GET /api/invitations/validate/:token` to display the tenant name and role.
7. The invitee fills in **Full Name** + **Password** and submits.
8. `POST /api/invitations/accept` creates their user account, assigns the role, marks the invitation `ACCEPTED`, and returns a session (access token + refresh token) — they are immediately logged in and redirected to `/dashboard`.

**Token security:**
- Tokens are stored as SHA-256 hashes — the raw token is never persisted.
- Default TTL: **7 days** (configurable via `INVITE_TOKEN_TTL_DAYS` env var).
- Statuses: `PENDING → ACCEPTED | REVOKED | EXPIRED`

```
POST /api/invitations
Authorization: Bearer <admin token>

{
  "email": "dr.smith@clinic.com",
  "role": "DOCTOR"
}

Response 201:
{
  "invitation": { "id": "...", "role": "DOCTOR", "expiresAt": "..." },
  "inviteUrl": "http://localhost:3000/invite/abc123...",
  "token": "abc123..."
}
```

---

#### Path 2 — Phone Invite (SMS-ready placeholder)

Used when a staff member doesn't have a corporate email or when mobile-first onboarding is preferred.

**How it works:**

1. Admin fills in **phone number** instead of (or alongside) email in the invite form.
2. `POST /api/invitations` accepts `{ phone, role }`.
3. The backend stores the phone on the invitation record.
4. The invite URL and token are generated identically to Path 1.
5. On the acceptance page, if the invitation has no email pre-filled, the invitee must supply one during account creation (the `AcceptInvitationDto` accepts an optional `email` field that merges with the invitation record).
6. SMS delivery of the link is **future-ready** — the `inviteUrl` is returned in the API response and the `appointment-events.service.ts` event hook is wired for a notification consumer to pick up.

```
POST /api/invitations
Authorization: Bearer <admin token>

{
  "phone": "+91-9876543210",
  "role": "RECEPTIONIST"
}
```

---

#### Path 3 — Public Client Self-Registration (`/join`)

Designed for patients/customers to register themselves without requiring an admin invite. They arrive via a tenant-specific link (e.g. a QR code on a clinic's reception desk).

**How it works:**

1. The tenant shares a URL: `https://<frontend>/join?t=<tenantSlug>`
2. The public `/join` page reads the `?t=` query param and presents a simple form.
3. **Phase 2 state:** placeholder shell — collects name + email/phone, role auto-assigned as `CUSTOMER`.
4. **Phase 6** (planned): OTP verification wired, direct account creation without an invitation record.

The `/join` page is fully public — no JWT required.

---

### QR Code Invite

After creating an invitation (Paths 1 or 2), the Settings page automatically renders a QR code using the `qrcode` browser package:

```tsx
// frontend/app/dashboard/settings/page.tsx
import QRCode from 'qrcode';

// After POST /api/invitations returns inviteUrl:
const dataUrl = await QRCode.toDataURL(inviteUrl);
// Rendered as <img src={dataUrl} /> alongside the copyable link
```

The QR code encodes the full `inviteUrl`. Scanning it on any mobile device opens the `/invite/[token]` acceptance page directly. This is especially useful for on-the-spot onboarding at a physical clinic — the admin displays the QR on screen and the new staff member scans it.

---

### Backend: Invitation Module

**Files:**
```
backend/src/invitations/
├── invitations.module.ts
├── invitations.controller.ts
├── invitations.service.ts
└── dto/
    └── invitations.dto.ts
```

**Prisma model:**
```prisma
model Invitation {
  id          String       @id @default(cuid())
  tenantId    String
  email       String?
  phone       String?
  roleId      String
  tokenHash   String       @unique
  status      InviteStatus @default(PENDING)
  expiresAt   DateTime
  createdById String
  acceptedAt  DateTime?
  createdAt   DateTime     @default(now())
  tenant      Tenant       @relation(fields: [tenantId], references: [id])
  role        Role         @relation(fields: [roleId], references: [id])
  createdBy   User         @relation(fields: [createdById], references: [id])
}

enum InviteStatus { PENDING ACCEPTED REVOKED EXPIRED }
```

**Role guards on each endpoint:**

| Endpoint | Auth | Permission |
|---|---|---|
| `GET /invitations/validate/:token` | Public | — |
| `POST /invitations/accept` | Public | — |
| `POST /invitations` | JWT | `invitations:create` + role `TENANT_ADMIN` or `SUPER_ADMIN` |
| `GET /invitations` | JWT | `invitations:read` + role `TENANT_ADMIN` or `SUPER_ADMIN` |
| `POST /invitations/:id/resend` | JWT | `invitations:create` |
| `DELETE /invitations/:id` | JWT | `invitations:create` (revoke) |

**Business rules enforced in service:**
- Cannot invite `SUPER_ADMIN` role (always throws `ForbiddenException`).
- Only `SUPER_ADMIN` can invite `TENANT_ADMIN`.
- A `TENANT_ADMIN` can only invite users to their own tenant.
- Duplicate email check — throws `ConflictException` if email already registered.
- Resend refreshes the token hash and extends expiry; only `PENDING` invitations can be resent.
- Revoke only works on `PENDING` invitations.

---

### Phase 2 Frontend Pages

| Route | Description |
|---|---|
| `/dashboard/settings` | Three-tab page: Org details · User list · Invite form + QR |
| `/invite/[token]` | Public accept page — validate token, set name + password, auto-login |
| `/join` | Public self-registration for clients (placeholder, Phase 6 OTP) |
| `/dashboard/layout` | Role-aware sidebar shell, `useAuth()` context |

**Auth Context (`frontend/lib/auth.tsx`):**

Central `AuthProvider` loaded on `/auth/me` at mount. Exposes:
```ts
type AuthUser = {
  id: string; email: string; name: string; userCode: string;
  roles: string[]; permissions: string[]; tenantId: string;
}
// Consumed everywhere via:
const { user, permissions, logout } = useAuth();
```

**Sidebar role-to-nav mapping:**

| Role | Nav items |
|---|---|
| `TENANT_ADMIN` | Dashboard · Users · Settings · Calendar · Availability |
| `DOCTOR` | Dashboard · Appointments · Calendar · Availability |
| `RECEPTIONIST` | Dashboard · Appointments · Calendar |
| `INVENTORY_MANAGER` | Dashboard · Inventory (placeholder) |
| `CUSTOMER` | Dashboard · Book Appointment · Calendar |

---

## Phase 3 — Appointment & Calendar System {#phase-3}

### Database Schema

Migration name: `20260515140000_appointments_calendar`

**New enums:**

```prisma
enum AppointmentStatus {
  PENDING CONFIRMED COMPLETED CANCELLED RESCHEDULED NO_SHOW
}
enum AppointmentSource {
  DASHBOARD PUBLIC_BOOKING CHATBOT ADMIN_CREATED
}
enum RecurrenceType { DAILY WEEKLY MONTHLY }
enum SlotType       { AVAILABLE BREAK BLOCKED }
```

**New models (all scoped by `tenantId`):**

| Model | Key fields | Purpose |
|---|---|---|
| `ServiceType` | `name, durationMinutes, colorCode, isActive` | Clinic's service catalog (e.g. "General Checkup – 30 min") |
| `Appointment` | `appointmentCode, customerId, assignedStaffId, serviceTypeId, startTime, endTime, status, source` | Core appointment record with self-relation for rescheduling |
| `AvailabilitySlot` | `staffId, startTime, endTime, slotType, isAvailable` | Concrete time slots per staff member |
| `RecurringAvailabilityRule` | `staffId, dayOfWeek, startHour, endHour, recurrenceType` | Weekly schedule templates (e.g. Mon–Fri 9am–5pm) |
| `BlockedSlot` | `staffId, blockedFrom, blockedTo, reason` | Holidays, leave, manual blocks |
| `AppointmentHistory` | `actionType, previousValue (JSON), newValue (JSON), performedById` | Full audit trail for every state change |
| `AppointmentNote` | `content, createdById` | Internal notes on an appointment |
| `AppointmentReminder` | `scheduledAt, channel, sent` | Future-ready notification placeholder |

---

### Backend Modules

#### ServiceTypesModule

```
backend/src/service-types/
├── service-types.module.ts
├── service-types.controller.ts
├── service-types.service.ts
└── dto/service-types.dto.ts
```

Manages the clinic's service catalog. Write operations require `TENANT_ADMIN` role.

#### AvailabilityModule

```
backend/src/availability/
├── availability.module.ts
├── availability.controller.ts
├── availability.service.ts
└── dto/availability.dto.ts
```

Core scheduling engine. Key service method:

```typescript
// computeAvailableSlots(tenantId, staffId, date):
// 1. Expand recurring rules into concrete slots for the day
// 2. Subtract blocked slot ranges
// 3. Subtract existing PENDING/CONFIRMED appointments
// 4. Return free time windows
```

#### AppointmentsModule

```
backend/src/appointments/
├── appointments.module.ts
├── appointments.controller.ts
├── appointments.service.ts
├── appointment-events.service.ts   ← EventEmitter2 hooks
└── dto/appointments.dto.ts
```

**Double-booking prevention** — every `create()` and `reschedule()` runs inside a Prisma transaction:

```typescript
await this.prisma.$transaction(async (tx) => {
  const overlap = await tx.appointment.findFirst({
    where: {
      tenantId,
      assignedStaffId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startTime: { lt: dto.endTime },
      endTime:   { gt: dto.startTime },
    },
  });
  if (overlap) throw new ConflictException('Time slot is already booked');
  // create appointment + AppointmentHistory entry in same transaction
});
```

**History tracking** — every state transition (create, confirm, cancel, reschedule, complete) writes an `AppointmentHistory` record with `previousValue` / `newValue` JSON snapshots.

**Event hooks** — `appointment-events.service.ts` emits `appointment.created`, `appointment.cancelled`, etc. via EventEmitter2; no consumers yet (wired for Phase 5 notifications).

#### CalendarModule

```
backend/src/calendar/
├── calendar.module.ts
├── calendar.controller.ts
├── calendar.service.ts
└── dto/calendar.dto.ts
```

Returns a unified payload merging appointments + availability + blocked slots for a given date range. Three views: `day`, `week`, `month`.

---

### API Reference

#### Service Types

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/service-types` | `service-types:read` | List all service types |
| `POST` | `/api/service-types` | `service-types:write` + `TENANT_ADMIN` | Create service type |
| `PATCH` | `/api/service-types/:id` | `service-types:write` | Update service type |
| `DELETE` | `/api/service-types/:id` | `service-types:write` | Delete service type |

#### Availability

| Method | Path | Permission | Description |
|---|---|---|---|
| `POST` | `/api/availability` | `availability:write` | Create slot or recurring rule |
| `GET` | `/api/availability` | `availability:read` | List slots (`?staffId=&from=&to=`) |
| `GET` | `/api/availability/recurring` | `availability:read` | List recurring rules for a staff member |
| `GET` | `/api/availability/free-slots` | `availability:read` | Compute free slots for booking wizard |
| `PATCH` | `/api/availability/:id` | `availability:write` | Update a slot |
| `DELETE` | `/api/availability/:id` | `availability:write` | Delete a slot |
| `POST` | `/api/availability/blocked` | `availability:write` | Create blocked slot |
| `GET` | `/api/availability/blocked` | `availability:read` | List blocked slots |
| `DELETE` | `/api/availability/blocked/:id` | `availability:write` | Delete blocked slot |
| `DELETE` | `/api/availability/recurring/:id` | `availability:write` | Delete recurring rule |

#### Appointments

| Method | Path | Permission | Description |
|---|---|---|---|
| `POST` | `/api/appointments` | `appointments:create` | Create appointment (double-booking check) |
| `GET` | `/api/appointments` | `appointments:read` | List with filters (status, staffId, serviceTypeId, dateRange) |
| `GET` | `/api/appointments/bookable-staff` | `appointments:create` | List staff available for booking |
| `GET` | `/api/appointments/:id` | `appointments:read` | Get appointment + history |
| `PATCH` | `/api/appointments/:id` | `appointments:update` | Update fields |
| `PATCH` | `/api/appointments/:id/cancel` | `appointments:cancel` | Cancel with reason |
| `PATCH` | `/api/appointments/:id/reschedule` | `appointments:update` | Reschedule (double-booking check) |
| `PATCH` | `/api/appointments/:id/complete` | `appointments:update` | Mark complete |

#### Calendar

| Method | Path | Permission | Query params | Description |
|---|---|---|---|---|
| `GET` | `/api/calendar/day` | `calendar:read` | `date=YYYY-MM-DD` | Day view payload |
| `GET` | `/api/calendar/week` | `calendar:read` | `date=YYYY-MM-DD` | Week view payload |
| `GET` | `/api/calendar/month` | `calendar:read` | `date=YYYY-MM-DD` | Month view payload |

---

### Frontend Pages & Components

#### Pages

| Route | Description |
|---|---|
| `/dashboard/appointments` | Table with status filters, pagination, quick-action buttons |
| `/dashboard/appointments/[id]` | Detail: summary card + `HistoryTimeline` + Cancel/Reschedule/Complete actions |
| `/dashboard/calendar` | Day/Week/Month switcher with color-coded appointment blocks |
| `/dashboard/booking` | 5-step `BookingWizard`: Service → Staff → Date → Slot → Confirm |
| `/dashboard/availability` | Weekly hour grid for recurring rules + blocked slot management |
| `/dashboard/service-types` | Admin table for the service catalog |

#### Zustand Stores

**`frontend/lib/store/appointments.ts`** — `useAppointmentsStore`
```ts
{
  appointments: Appointment[];
  filters: { status?, staffId?, serviceTypeId?, dateRange? };
  pagination: { page, pageSize, total };
  selectedAppointment: Appointment | null;
  isLoading: boolean;
  error: string | null;
}
```

**`frontend/lib/store/calendar.ts`** — `useCalendarStore`
```ts
{
  viewMode: 'day' | 'week' | 'month';
  currentDate: Date;
  appointmentsCache: Record<string, CalendarPayload>;
  isLoading: boolean;
}
```

#### Shared Components (`frontend/components/appointments/`)

| Component | Purpose |
|---|---|
| `StatusBadge.tsx` | Colored pill for each `AppointmentStatus` using design system tokens |
| `AppointmentCard.tsx` | Compact card for calendar blocks and list rows |
| `SlotPicker.tsx` | Time slot grid — disabled states for unavailable/booked slots |
| `HistoryTimeline.tsx` | Vertical timeline of `AppointmentHistory` entries |
| `CalendarGrid.tsx` | Day/week/month layout switcher + rendered cells |
| `BookingWizard.tsx` | 5-step multi-form orchestrator |
| `AvailabilityGrid.tsx` | Weekly hours grid for schedule management |
| `AppointmentFilters.tsx` | Filter bar: date range · status · staff · service type |

#### Status Color Mapping (CSS tokens)

| Status | Color class | Token |
|---|---|---|
| `PENDING` | Muted amber tint | `--na-bg` variant |
| `CONFIRMED` | Cyan | `--na-cyan` |
| `COMPLETED` | Muted green | — |
| `CANCELLED` / `NO_SHOW` | Muted red | — |
| `RESCHEDULED` | Accent blue | `--na-accent` |

---

## Permission Matrix

| Permission | SUPER_ADMIN | TENANT_ADMIN | DOCTOR | RECEPTIONIST | STAFF | CUSTOMER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `invitations:create` | ✓ | ✓ | — | — | — | — |
| `invitations:read` | ✓ | ✓ | — | — | — | — |
| `appointments:create` | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| `appointments:read` | ✓ | ✓ | own | ✓ | — | own |
| `appointments:update` | ✓ | ✓ | own | ✓ | — | — |
| `appointments:cancel` | ✓ | ✓ | own | ✓ | — | own |
| `availability:read` | ✓ | ✓ | own | ✓ | ✓ | ✓ |
| `availability:write` | ✓ | ✓ | own | — | own | — |
| `service-types:read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `service-types:write` | ✓ | ✓ | — | — | — | — |
| `calendar:read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Data Flow Diagrams

### Invite Flow (Path 1 — Email)

```
Admin (Settings UI)
  │
  ├─ POST /api/invitations { email, role }
  │        │
  │        ├─ Generate rawToken (32 bytes)
  │        ├─ Store SHA-256(rawToken) in DB
  │        └─ Return { inviteUrl, token }
  │
  ├─ Render QR code from inviteUrl (browser qrcode lib)
  │
Invitee scans QR / clicks link
  │
  ├─ GET /api/invitations/validate/:token  [Public]
  │        └─ Returns { tenantName, role, email, expiresAt }
  │
  ├─ Form: { firstName, lastName, password }
  │
  └─ POST /api/invitations/accept { token, firstName, password }
           ├─ Hash token → lookup invitation
           ├─ $transaction: create User + assign Role + mark ACCEPTED
           └─ Return session (accessToken, refreshToken)
               └─ Redirect to /dashboard (auto-logged-in)
```

### Appointment Booking Flow (5-Step Wizard)

```
Customer / Receptionist
  │
  Step 1 ─ GET /api/service-types          → select service
  Step 2 ─ GET /api/appointments/bookable-staff → select doctor/staff
  Step 3 ─ GET /api/availability/free-slots?staffId=&date= → select date
  Step 4 ─ SlotPicker renders free windows  → select time slot
  Step 5 ─ Confirm summary
           │
           └─ POST /api/appointments { serviceTypeId, assignedStaffId,
                                       customerId, startTime, endTime }
                    │
                    └─ $transaction:
                         ├─ Overlap check (PENDING|CONFIRMED appointments)
                         ├─ Create Appointment (appointmentCode generated)
                         └─ Create AppointmentHistory (action: CREATED)
```

### Calendar Data Flow

```
Frontend CalendarGrid
  │
  ├─ GET /api/calendar/week?date=2026-05-15
  │        │
  │        └─ CalendarService.getView(actor, 'week', { date })
  │                 ├─ Query Appointments in date range
  │                 ├─ Query AvailabilitySlots in range
  │                 ├─ Query BlockedSlots in range
  │                 └─ Return unified { appointments[], slots[], blocked[] }
  │
  └─ CalendarGrid renders colored blocks per appointment
     (color from ServiceType.colorCode)
```

---

## Environment Variables Required

```env
# Backend
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
BCRYPT_ROUNDS=12
INVITE_TOKEN_TTL_DAYS=7
FRONTEND_ORIGIN=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## File Tree Summary (New Files Today)

```
backend/
├── prisma/
│   ├── schema.prisma               (modified — +~180 lines)
│   ├── seed.ts                     (modified — new permissions)
│   └── migrations/
│       └── 20260515140000_appointments_calendar/migration.sql
└── src/
    ├── app.module.ts               (modified — 4 new imports)
    ├── invitations/                (new — 4 files)
    ├── appointments/               (new — 5 files)
    ├── availability/               (new — 4 files)
    ├── calendar/                   (new — 4 files)
    ├── service-types/              (new — 4 files)
    └── common/utils/
        ├── appointment-code.util.ts (new)
        └── scheduling.util.ts      (new)

frontend/
├── lib/
│   ├── auth.tsx                    (new — AuthProvider + useAuth)
│   └── store/
│       ├── appointments.ts         (new — Zustand)
│       └── calendar.ts             (new — Zustand)
├── app/
│   ├── layout.tsx                  (modified — AuthProvider wrapper)
│   ├── dashboard/
│   │   ├── layout.tsx              (rewritten — sidebar shell)
│   │   ├── settings/page.tsx       (new — org + users + invite + QR)
│   │   ├── appointments/
│   │   │   ├── page.tsx            (new — list + filters)
│   │   │   └── [id]/page.tsx       (new — detail + timeline)
│   │   ├── calendar/page.tsx       (new)
│   │   ├── booking/page.tsx        (new — 5-step wizard)
│   │   ├── availability/page.tsx   (new)
│   │   └── service-types/page.tsx  (new)
│   ├── invite/[token]/page.tsx     (new — public accept page)
│   └── join/page.tsx               (new — public client entry)
└── components/
    ├── dashboard/
    │   └── Sidebar.tsx             (new — role-gated nav)
    └── appointments/               (new — 8 components)
        ├── StatusBadge.tsx
        ├── AppointmentCard.tsx
        ├── SlotPicker.tsx
        ├── HistoryTimeline.tsx
        ├── CalendarGrid.tsx
        ├── BookingWizard.tsx
        ├── AvailabilityGrid.tsx
        └── AppointmentFilters.tsx
```
