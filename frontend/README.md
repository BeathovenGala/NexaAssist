# Frontend

This is the Next.js app for NexaAssist. It serves the landing page, auth flows, and the dashboard UI on port `3001`.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example env file:

```bash
copy .env.example .env.local
```

3. Keep the backend running at `http://localhost:4000`.

## Environment

The frontend only needs a small set of public variables:

- `NEXT_PUBLIC_API_URL` points the app at the NestJS API.
- `NEXT_PUBLIC_DEMO_PASSWORD` enables the demo login CTA.
- `NEXT_PUBLIC_SPLINE_HERO_SCENE` and `NEXT_PUBLIC_SPLINE_ORBIT_SCENE` override the landing page Spline scenes if needed.

See [.env.example](.env.example) for the defaults.

## Run

```bash
npm run dev
```

Then open http://localhost:3001.

If you want a production-style check locally:

```bash
npm run build
npm run start
```

For linting:

```bash
npm run lint
```

## Terminal Plan

| Terminal | Command | When to use it |
|----------|---------|----------------|
| 1 | `npm run dev` | Run the Next.js app |

You do not need a second frontend terminal. The backend API and worker live in `backend/`.

## Common Tasks

| Goal | Command |
|------|---------|
| Run the app | `npm run dev` |
| Build the app | `npm run build` |
| Start the built app | `npm run start` |
| Lint the code | `npm run lint` |

## Notes

- The frontend talks to the API under `/api`.
- Most authenticated flows expect the backend to be running first.
- If demo login fails, check `NEXT_PUBLIC_DEMO_PASSWORD` and confirm the backend seed data exists.
