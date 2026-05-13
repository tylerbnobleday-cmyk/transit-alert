# Render Deploy

This repo can now run on Render as a single Node web service.

## What it uses

- Frontend: Vite build output from `dist`
- Backend: existing `api/*` handlers, served through `server/render-server.js`

## Build + start

- Build command: `corepack pnpm install --frozen-lockfile && corepack pnpm build`
- Start command: `node server/render-server.js`

Render can also read these from [render.yaml](./render.yaml).

## Required environment variables

- `PTV_SUBSCRIPTION_KEY`
- `AUTH_SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `DATABASE_URL`

## Optional environment variables

- `APPROVED_DEBUG_TESTERS`
- `DEBUG_TESTER_APPROVALS`
- `NSW_TRANSPORT_API_KEY`
- `TRACKED_CONSISTS`
- `REGISTRATION_PHASE`

## Notes

- Account registration, saved preferences, and admin-managed access should now be treated as database-backed features.
- `render.yaml` now includes a Render Postgres blueprint entry named `transit-alert-db` and wires its connection string into `DATABASE_URL`.
- On first startup, the server bootstraps the required auth/config/preferences tables automatically when `DATABASE_URL` is present.
- The Render server serves SPA routes like `/app` by falling back to `dist/index.html`.
- Render was failing on `corepack enable` because its filesystem is read-only there, so use `corepack pnpm ...` directly instead.
