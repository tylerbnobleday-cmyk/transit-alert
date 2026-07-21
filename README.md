# TransitAlert

TransitAlert is an independent Melbourne public transport map and tracking app focused on trains, trams, buses, V/Line, selected freight overlays, guest browsing, and tester/admin tools for validating live transport features.

## Current release

- Web version: `0.92`
- Public guest frontend: [GitHub Pages](https://tylerbnobleday-cmyk.github.io/transit-alert/)
- Local/live backend host target: local Node server with optional tunnel or Render-style deployment
- Frontend: Vite + React + TypeScript
- Backend/API style: local Node server with API handlers under [`api/`](api/)

## Guest version 0.92

Version `0.92` is the current public guest release.

- Guest users can browse the map and planner without making an account
- Signed-in tester/admin accounts now persist in the real embedded database configured through `DATABASE_URL`
- Tester registration is still gated through `APPROVED_DEBUG_TESTERS`
- NSW TrainLink/XPT regional labelling was cleaned up to reduce generic fleet confusion
- Mobile account screens were tightened up so they feel less cramped on narrow phones

### 0.92 bug fixes

- Connected station cards to the official dated Transport Victoria GTFS schedule with GTFS-Realtime overlays for expected times, delays, cancellations, and skipped stops.
- Live bus markers now open the exact official trip update and show its published upcoming stops, stop IDs, and expected times.
- Added a GitHub Pages SPA fallback so direct and shared app routes no longer return a GitHub 404.
- Kept the no-fake-data rule: unpublished departures, stops, and vehicle details remain unavailable rather than being generated.
- Reported by Jack Miller: the missing verified station replacement after fake boards were removed, and live bus markers not opening their stop sequence.

### 0.91 bug fixes

- Restored Glen Huntly, Ormond, McKinnon, and other in-range station markers that mobile map thinning hid too aggressively.
- Added live bus route, PTV run, vehicle/fleet ID, registration, and current stop fields whenever those values are published by the PTV feed.
- Corrected regional corridor inference so a Maryborough-area train cannot be presented as a Geelong service simply because PTV supplied a generic V/Line label.
- Improved Ballarat, Ararat, Maryborough, and Bendigo regional line alignment and added the missing Bendigo map corridor.
- Removed generated station boards, surface-stop countdowns, regional timelines, freight movements, and PID previews. Missing feeds now show an honest unavailable state.
- Live markers no longer fall back to guessed station coordinates, and nearest mapped bus stops are explicitly labelled as proximity estimates.
- Temporary passwords can now be marked for mandatory replacement at next login; normal account tools remain locked until the user chooses a new password.
- Reported by Jack Miller: missing mobile station labels, inaccurate V/Line alignment/service classification, and the incorrect Town Hall departure shown at Armadale.

### Live-data policy

TransitAlert never presents generated or placeholder departures, times, delays, platforms, service IDs, vehicle positions, registrations, or fleet numbers as real. A user-facing live value must come from a connected transport feed; unavailable fields remain unavailable.

## Main features

- Guest map + planner access for public browsing
- Live Metro, tram, bus, and V/Line map layers
- Premium-gated train lookup tools
- Journey planner with saved active journey state
- Admin panel for:
  - account management
  - runtime config
  - marker overrides
  - approved debug tester visibility
- Freight overlay and selected interstate/XPT support
- Embedded local database hosting via `pglite://...` for self-hosted account persistence

## Copyright

Copyright 2026 Tyler Rose. TransitAlert, its app presentation, and original project assets are Tyler Rose work.

TransitAlert remains an independent project and is not operated by, affiliated with, or endorsed by the Department of Transport and Planning, Transport Victoria, PTV, or Metro Trains Melbourne.

## Account model

Right now the app is still in a tester/admin phase rather than open public registration.

- Public registration is not fully open yet
- Approved debug testers can register while tester mode is active
- Admins can manage roles, premium access, and tester visibility from the app
- A real `DATABASE_URL` is required for proper account persistence
- The local self-host path can use `pglite://.local-db/transit-alert`

## Important environment variables

- `DATABASE_URL`
- `AUTH_SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL` (optional, but supported)
- `APPROVED_DEBUG_TESTERS`
- `PTV_SUBSCRIPTION_KEY`
- `NSW_TRANSPORT_API_KEY` (optional for NSW/XPT live support)

Set `NSW_TRANSPORT_API_KEY` on the live host for NSW TrainLink/XPT realtime support. Do not commit the token into the repo.

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

## Self-host / local background host

This repo can run as its own background host on your PC.

Recommended commands:

- Build:

```bash
powershell -ExecutionPolicy Bypass -File scripts/local-host-build.ps1
```

- Start local background host:

```bash
powershell -ExecutionPolicy Bypass -File scripts/local-host-start.ps1
```

The local host config lives at `.local-host/host-config.ps1` and now supports:

- `DATABASE_URL=pglite://.local-db/transit-alert`
- `APPROVED_DEBUG_TESTERS`
- `PTV_SUBSCRIPTION_KEY`
- `NSW_TRANSPORT_API_KEY`

## Render deployment

The repo can still be deployed on Render if you want a cloud backend later.

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

## Split deployment: Frontend on GitHub Pages, Backend on Render

This repository can be deployed with the frontend as a static site on GitHub Pages and the Node.js backend running on Render. Key steps and notes:

- **Frontend build configuration**: Vite reads `BASE_PATH` (or `process.env.BASE_PATH`) to set the `base` path used for assets and routing. The GitHub Actions workflow sets `BASE_PATH` to `/transit-alert/` for the repo.
- **API base URL**: The frontend uses the environment variable `VITE_API_BASE_URL` at build time to point API requests to the Render backend. Set the secret `RENDER_BACKEND_URL` in GitHub to your Render service URL (e.g. `https://transit-alert.onrender.com`).
- **CORS**: The backend enables CORS. You can configure allowed origins with the `ALLOWED_ORIGINS` environment variable on Render (comma-separated patterns, supports `*` and `*.github.io`). Default allows `https://*.github.io`, `https://transit-alert.onrender.com`, and localhost dev ports.
- **GitHub Actions**: A workflow at `.github/workflows/deploy-frontend.yml` will build the frontend and publish the `dist/` output to the `gh-pages` branch when you push to `master`.

Quick checklist:

- On Render: keep the existing service (`render.yaml`) for the backend. Ensure `DATABASE_URL`, `AUTH_SESSION_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` remain configured.
- On GitHub: add repository secret `RENDER_BACKEND_URL` set to your Render URL (for production builds).
- Optionally set `ALLOWED_ORIGINS` on Render to restrict CORS to your site.
- If you want to build the frontend locally for GitHub Pages, run `pnpm run build:github-pages`.

Local development:

- Run `pnpm install` then `pnpm dev`. The frontend will default to using `http://localhost:3000` as a development backend if available.
- To test against your Render backend locally, set `VITE_API_BASE_URL` in your local environment before building or running.

If you'd like, I can now:

- Add an `.env.example` documenting the frontend build env variables.
- Add a small script to `package.json` to build with the correct `BASE_PATH` for GitHub Pages.
