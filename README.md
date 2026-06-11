# TransitAlert

TransitAlert is an independent Melbourne public transport map and tracking app focused on trains, trams, buses, V/Line, selected freight overlays, and tester/admin tools for validating live transport features.

## Current release

- Web version: `0.89`
- Host target: Render
- Frontend: Vite + React + TypeScript
- Backend/API style: local Node server with API handlers under [`api/`](api/)

## Main features

- Live Metro, tram, bus, and V/Line map layers
- Premium-gated train lookup tools
- Journey planner with saved active journey state
- Admin panel for:
  - account management
  - runtime config
  - marker overrides
  - approved debug tester visibility
- Freight overlay and selected interstate/XPT support

## Copyright

Copyright 2026 Tyler Rose. TransitAlert, its app presentation, and original project assets are Tyler Rose work.

TransitAlert remains an independent project and is not operated by, affiliated with, or endorsed by the Department of Transport and Planning, Transport Victoria, PTV, or Metro Trains Melbourne.

## Account model

Right now the app is still in a tester/admin phase rather than open public registration.

- Public registration is not fully open yet
- Approved debug testers can register while tester mode is active
- Admins can manage roles, premium access, and tester visibility from the app
- A real `DATABASE_URL` is required for proper account persistence

## Important environment variables

- `DATABASE_URL`
- `AUTH_SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL` (optional, but supported)
- `APPROVED_DEBUG_TESTERS`
- `PTV_SUBSCRIPTION_KEY`
- `NSW_TRANSPORT_API_KEY` (optional for NSW/XPT live support)

Set `NSW_TRANSPORT_API_KEY` in Render environment variables for NSW TrainLink/XPT live tracking. Do not commit the token into the repo.

## Local development

Install dependencies:

```bash
pnpm install
```

Run the app:

```bash
pnpm dev
```

Build the app:

```bash
pnpm build
```

Run the production-style server locally:

```bash
pnpm start
```

## Render deployment

The repo is set up to run on Render.

Recommended commands:

- Build:

```bash
corepack pnpm install --frozen-lockfile && corepack pnpm build
```

- Start:

```bash
node server/render-server.js
```

Make sure `DATABASE_URL` is a full PostgreSQL connection string, not just a token or password fragment.

## Release direction

TransitAlert is intended to stay:

- independent in branding/assets
- safer with account/session handling
- more careful with operational transport data
- more stable on mobile while remaining full-featured on desktop

See the internal policy note at [`docs/ORIGINAL_ASSETS_PRIVACY_AND_OPERATIONS.md`](docs/ORIGINAL_ASSETS_PRIVACY_AND_OPERATIONS.md).
