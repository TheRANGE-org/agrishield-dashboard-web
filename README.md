# AgriShield Dashboard Web

**Version:** 0.1.1

v1 stakeholder dashboard frontend for AgriShield. React + Vite + Tailwind, deployed to Cloudflare Pages.

## Production

| | |
|---|---|
| **URL** | `https://agrishield.landmanager.io` |
| **Platform** | Cloudflare Pages, auto-deploys from `main` |
| **Auth** | Cloudflare Access — email one-time PIN |
| **Allowlist** | Managed in Cloudflare dashboard → Zero Trust → Access → Applications → "AgriShield Dashboard" → "Board members" policy |
| **Backend** | `https://agrishield-api.landmanager.io` |

### Authentication

Board members receive an email with a one-time PIN when they visit the dashboard. No password, no app install. Sessions last 24 hours.

To add or remove a board member, update the email list in the **Cloudflare dashboard** (Zero Trust → Access → Applications → AgriShield Dashboard → Board members policy). Do not put email addresses in this repo.

### Deployment

Every push to `main` triggers an automatic deployment via Cloudflare Pages. No manual deploy step.

Pull requests get automatic preview deployments at `https://<branch>.<hash>.agrishield-dashboard-web.pages.dev`. Preview builds use the same backend as production (`https://agrishield-api.landmanager.io`).

---

## What this is

A read-only web dashboard for TheRANGE Foundation board members and funding partners. Shows whether the AgriShield sensor fleet is healthy and what recent environmental data looks like. Non-technical audience; primary use case is checking fleet health from a phone.

---

## Local development

### Prerequisites

- Node 22+
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

---

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

---

## Pages

| Path              | Description                                                      |
|-------------------|------------------------------------------------------------------|
| `/`               | Fleet view — node tile grid, auto-refreshes 30s. Defaults to production nodes. |
| `/map`            | Fleet map — full-page map using the same site and deployment filters. |
| `/nodes/:nodeId`  | Node detail — headline charts, time window selector, full telemetry |
| `/diagnostics`    | Operator diagnostics — backend internals (hidden from nav)        |

---

## Environment variables

| Variable              | Description                         |
|-----------------------|-------------------------------------|
| `VITE_API_BASE_URL`   | Base URL of the dashboard API       |

All variables must be prefixed `VITE_` to be accessible from client code (Vite requirement).

**CF Pages environment variable setup:** Cloudflare dashboard → Pages → agrishield-dashboard-web → Settings → Environment variables. Set `VITE_API_BASE_URL = https://agrishield-api.landmanager.io` for both Production and Preview environments.

---

## Design decisions

- **Light theme**: white/slate background, Inter font, environmental-green accent. Board members view primarily on phones in lit environments.
- **Metadata-driven labels**: metric labels, units, and tooltip text come from `/api/metadata`; the frontend never hardcodes them.
- **Real-time ticker**: a 1-second interval updates "last seen" counters without network re-fetches. Node status transitions (live→stale→dead) happen in real time between fleet polls.
- **Fleet and map filters**: Fleet (`/`) is the card board and Map (`/map`) is the full-page map. Both read `deployment` (`production` by default, or `lab`, or `all`) and `site` from the query string. A missing `deployment_mode` stays lab, so an unconfigured node stays off the production board. The header counts nodes the filter is hiding. "Show on map" opens `/map` on that node. The board uses the full display width and adds a column whenever another card of about 320px fits. Offline cards come first, then stale, then live.
- **Fleet card styles**: the card shows deployment, contact, and readings at the same time. The header band is sky blue for lab and untinted for production, with a Lab badge on the card and on the node detail header. `deployment_mode` comes from the latest telemetry, or from the latest reading when telemetry has no mode. Missing mode is lab. The card body is white when readings are fully functional and yellow when a monitored sensor is missing, degraded, unhealthy, or flat. Contact is a left bar and an inset frame: none when live, amber when stale, red when offline. A stale or dead lab node keeps those contact colors. The yellow body is the readings signal, not the lab marker.
- **Sensor health**: a monitored sensor stays healthy when it is initialized, its error count is 0, its last successful read is within 10 minutes, and the reading is not flat. Degraded means errors since the last good read while a reading is still present. Unhealthy means the last successful read is older than 10 minutes, the reading is flat, or the error count is above 0 with no current reading. The lifetime auto re-init count is shown on the sensor row as Auto re-inits. It does not change that severity, so it does not turn the fleet card yellow.
- **No state management library**: React state + SWR is sufficient for a read-only polling dashboard.
- **Historical data >24h is read from R2**: the 7d preset and custom ranges send absolute timestamps. The API serves those from `agrishield-lake`. A first read of a dense multi-day span takes tens of seconds, so the client waits 120 seconds. A repeat of the same hours within the API cache TTL is served from memory. Windows of 24h and shorter stay on the API's in-memory frames and use a 30 second timeout.
- **CO₂ comes from whichever sensor the node reports**: the fleet tile label is CO₂. `scd41_co2_ppm` is used when that reading is present, including on the chart pair `scd41_co2_ppm` / `scd41_co2_ppm_max` and in the SCD41 health row. When it is absent, the tile, chart, and health panel use `mhz19e_co2_ppm` / `mhz19e_co2_ppm_max` and the MH-Z19E health fields. MH-Z19E names are omitted from queries until `/api/metadata` lists them, because one unknown metric fails the whole query. A node with neither numeric reading shows a dash.
- **Wind direction not charted**: `wind_vane_degrees_avg` uses circular-mean math that is meaningless on a standard Y axis (350° and 10° are adjacent, not 340° apart). Wind direction is shown as a rotated arrow icon + compass-point label in the node's latest-state strip.
- **Mobile chart performance**: 1440 points per chart at 24h is handled fine by Recharts on modern devices. If sluggishness is observed on low-end Android, consider `bucket=5m` for the 24h window (reduces to 288 points). This is not pre-optimized.
- **No hardcoded backend URLs**: client calls use `VITE_API_BASE_URL`. Leave it empty in local `.env` so the Vite dev server proxies `/api/*` and `/health`. The proxy target is `VITE_API_BASE_URL` when that file sets one, and otherwise the v2 Cloud Run service. Set `VITE_API_BASE_URL=http://localhost:8080` to develop against a local API. A shell export does not override an empty value in `.env`.
