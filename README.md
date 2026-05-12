# AgriShield Dashboard Web

v1 stakeholder dashboard frontend for AgriShield. React + Vite + Tailwind, deployed to CF Pages.

## What this is

A read-only web dashboard for TheRANGE Foundation board members and funding partners. Shows whether the AgriShield sensor fleet is healthy and what recent environmental data looks like. Non-technical audience; primary use case is checking fleet health from a phone.

## Local development

### Prerequisites

- Node 20+
- pnpm (`npm install -g pnpm`)

### Setup

```bash
# Clone the repo
git clone https://github.com/TheRANGE-org/agrishield-dashboard-web
cd agrishield-dashboard-web

# Install dependencies
pnpm install

# Copy environment file and (optionally) adjust
cp .env.example .env
# The default .env.example points at the deployed backend.
# To develop against a local backend, change VITE_API_BASE_URL to http://localhost:8080

# Start the dev server
pnpm dev
# Browser opens at http://localhost:5173
```

### Commands

| Command           | Description                              |
|-------------------|------------------------------------------|
| `pnpm dev`        | Start Vite dev server (HMR)              |
| `pnpm build`      | Type-check + produce `dist/` bundle      |
| `pnpm typecheck`  | Run `tsc --noEmit`                       |
| `pnpm lint`       | Run ESLint                               |
| `pnpm test`       | Run Vitest (unit tests)                  |
| `pnpm test:watch` | Vitest in watch mode                     |

## Tech stack

| Layer    | Choice                        |
|----------|-------------------------------|
| Framework | React 19                     |
| Build     | Vite 5                       |
| Styling   | Tailwind CSS v4              |
| Routing   | React Router v7              |
| Data fetching | SWR (polling, SWR cache) |
| Charts    | Recharts 3                   |
| Map       | Leaflet + react-leaflet (OSM tiles) |
| Icons     | Lucide React                 |
| Testing   | Vitest                       |
| Language  | TypeScript 5 (strict)        |

## Pages

| Path              | Description                                                      |
|-------------------|------------------------------------------------------------------|
| `/`               | Fleet view — OSM map + node tile grid, auto-refreshes 30s        |
| `/nodes/:nodeId`  | Node detail — headline charts, time window selector, full telemetry |
| `/diagnostics`    | Operator diagnostics — backend internals (hidden from nav)        |

**Phase 5 will add:** CF Pages deployment, CF Access authentication.

## Environment variables

| Variable              | Description                         |
|-----------------------|-------------------------------------|
| `VITE_API_BASE_URL`   | Base URL of the dashboard API       |

All variables must be prefixed `VITE_` to be accessible from client code (Vite requirement).

## Design decisions

- **Light theme**: white/slate background, Inter font, environmental-green accent. Board members view primarily on phones in lit environments.
- **Metadata-driven labels**: metric labels, units, and tooltip text come from `/api/metadata`; the frontend never hardcodes them.
- **Real-time ticker**: a 1-second interval updates "last seen" counters without network re-fetches. Node status transitions (live→stale→dead) happen in real time between fleet polls.
- **No state management library**: React state + SWR is sufficient for a read-only polling dashboard.
- **Historical data >24h is GCS-backed**: queries for 7d and 30d windows are routed through the backend's GCS layer. The first query for a given window may take 1–3 seconds; subsequent queries within the TTL window are served from the backend's in-process cache. The backend's `/api/diagnostics` `gcs_cache.hit_rate` increments on cache hits.
- **Wind direction not charted**: `wind_vane_degrees_avg` uses circular-mean math that is meaningless on a standard Y axis (350° and 10° are adjacent, not 340° apart). Wind direction is shown as a rotated arrow icon + compass-point label in the node's latest-state strip.
- **Mobile chart performance**: 1440 points per chart at 24h is handled fine by Recharts on modern devices. If sluggishness is observed on low-end Android, consider `bucket=5m` for the 24h window (reduces to 288 points). This is not pre-optimized.
