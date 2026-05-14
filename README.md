# NexaAssist

Multi-tenant SaaS platform — Phase 1: auth, tenancy, RBAC, secure APIs.

## Quick start

1. Copy environment files:

   ```bash
   cp .env.example backend/.env
   cp .env.example frontend/.env.local
   ```

   Adjust `JWT_*` secrets for production.

2. Start PostgreSQL and Redis (Postgres is mapped to host port **5433** to avoid local conflicts):

   ```bash
   docker compose up -d
   ```

3. Backend:

   ```bash
   cd backend
   npm install
   npx prisma migrate dev
   # Seed roles/permissions (destructive: wipes users/tenants). Optional super admin:
   # set SEED_SUPER_ADMIN_EMAIL / SEED_SUPER_ADMIN_PASSWORD in backend/.env then:
   npm run db:seed
   npm run start:dev
   ```

4. Frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

- API: `http://localhost:4000/api` (e.g. `GET /api/health`)
- App: `http://localhost:3000`

## Project layout

- `backend/` — NestJS + Prisma + PostgreSQL
- `frontend/` — Next.js 15 + Tailwind
