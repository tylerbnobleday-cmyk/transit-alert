# TransitAlert

TransitAlert is an independent Melbourne public transport map and tracking app focused on trains, trams, buses, V/Line, selected freight overlays, guest browsing, and tester/admin tools for validating live transport features.

## Current release

- Web version: `1.0`
- Webpage: [transit-alert.com](https://transit-alert.com)
- Local/live backend host target: local Node server with optional tunnel or Render-style deployment
- Frontend: Vite + React + TypeScript
- Backend/API style: local Node server with API handlers under [`api/`](api/)

## Guest version 1.0

Version `1.0` is the current public guest release.

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
