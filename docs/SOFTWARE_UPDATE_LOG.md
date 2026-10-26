# Software Update Log

**Version:** 1.1
**Last checked:** 26 October 2026, 13:16 CDT

This log records the software update state of the AgriShield services other than the sensor nodes. The node fleet and the Headscale host are recorded in `agrishield-raspi4-repo/docs/SOFTWARE_UPDATE_LOG.md`.

The October 2026 eMudhra/emSign disclosure required clients to stop trusting **emSign ECC Root CA - G3** and **Comodo AAA Services root**. Browser updates do not update Cloud Run containers. Python `httpx` and `requests` use the `certifi` bundle, not the Debian trust store.

These working trees are updated and not committed. The Cloud Run revisions below were built from those uncommitted trees.

---

## Summary

| Project | Runtime | Trust-store work | Production after this check |
|---------|---------|------------------|-----------------------------|
| agrishield-aggregator-service | Cloud Run, two services | Done in the new image | Revisions `00009-n4h` and `00008-t2j`, both healthy |
| agrishield-dashboard-api | Cloud Run | Done in the new image | Revision `00033-ghv`, healthy, backfill complete |
| agrishield-dashboard-web | Cloudflare Pages | Browsers and Cloudflare terminate TLS | Lockfile updated. Pages still serves the 28 July build until this is pushed |
| agrishield-edge-worker | Cloudflare Workers | Worker `fetch` uses Cloudflare's trust store | Version `803e6856-1d43-45f7-b633-b9ce691e75e0`, health ok |
| build-dashboard | None. Local reference notes | None | No deployed software |

---

## Trust store

`certifi` 2026.10.23 removes both compromised roots. pip 26.2.2 vendors that bundle. Debian 13 package `ca-certificates` `20250419+deb13u1` no longer ships either root. The Cloud Run Dockerfiles upgrade the base image and fail the build if either name is still in the OS bundle or in `certifi`.

Checked in the images built on 26 October:

| Item | Value |
|------|-------|
| Base images | `python:3.11-slim` (aggregator), `python:3.12-slim` (dashboard API) |
| OS | Debian GNU/Linux 13.7 (trixie) |
| Python | 3.11.17 and 3.12.15 |
| ca-certificates | `20250419+deb13u1` |
| OpenSSL | `3.5.7-1~deb13u3` |
| tzdata | `2026e-0+deb13u1` (the image upgrade moved it from `2026c`) |
| pip | 26.2.2 |
| certifi | 2026.10.23, both compromised roots absent |

---

## agrishield-aggregator-service

Cloud Run project `therange-495717`, region `us-south1`. Image `us-south1-docker.pkg.dev/therange-495717/cloud-run-source-deploy/agrishield-aggregator@sha256:adf54a6320be9bd891132482503eb6fc37c31e2054bc96139ef86ff119d05be8`.

The previous image was built 29 July 2026 and was still serving on 26 October. That build predates `certifi` 2026.10.23.

| Service | Previous revision | Now serving | Health at 13:02 CDT |
|---------|-------------------|-------------|----------------------|
| agrishield-aggregator-readings | `00008-t8s` (29 July 2026) | `00009-n4h` | `GET /health` returned `{"status":"ok"}` |
| agrishield-aggregator-telemetry | `00007-p8q` (30 July 2026) | `00008-t2j` | `GET /health` returned `{"status":"ok"}` |

Cloud Scheduler was left as it was. Both services still require authenticated invocation.

Runtime libraries installed into the image:

| Package | Installed |
|---------|-----------|
| fastapi | 0.162.0 |
| uvicorn | 0.54.0 |
| pydantic | 2.14.1 |
| httpx | 0.28.1 |
| google-cloud-storage | 3.17.1 |
| cryptography | 50.0.2 |
| urllib3 | 2.8.0 |
| requests | 2.34.2 |
| idna | 3.20 |
| certifi | 2026.10.23 |

`pyproject.toml` now requires `certifi>=2026.10.23`. The local test run against those versions was 26 passed. `google.api_core` warns that new releases after 24 October 2027 will not support the workstation's Python 3.11.2. The container is Python 3.11.17.

---

## agrishield-dashboard-api

Cloud Run project `therange-495717`, region `us-south1`. Public URL `https://agrishield-api.landmanager.io`.

The previous revision `00032-qfc` was created 28 July 2026 from a lockfile that pinned `certifi` 2026.4.22.

| Item | Now |
|------|-----|
| Revision | `agrishield-dashboard-api-00033-ghv` |
| Created | 26 October 2026, 13:02 CDT |
| `GET /health` | `{"status":"ready"}` |
| GCS backfill | Complete in 1970 ms |
| Edge poll | 10 envelopes, 178 ms, 0 consecutive failures |
| Headscale poll | 9 nodes, 458 ms, 0 consecutive failures |

Locked runtime versions now include `certifi` 2026.10.23, `cryptography` 50.0.2, `urllib3` 2.8.0, `requests` 2.34.2, `idna` 3.20, `fastapi` 0.162.0, `uvicorn` 0.54.0, `pydantic` 2.14.1, `google-cloud-storage` 3.17.1, and `cachetools` 7.2.5. `httpx` was already 0.28.1. `pyyaml` stays 6.0.3, which is the current release.

Left on the current major line:

| Package | Locked | Current major on PyPI | Why it stayed |
|---------|--------|------------------------|---------------|
| polars | 1.40.1 | 2.1.0 | New major |
| duckdb | 1.5.2 | 2.0.0 | New major. The API uses DuckDB to parse local JSONL, not for outbound TLS |

The image build also installs the DuckDB `httpfs` extension for the existing startup step. GCS reads go through `google-cloud-storage`, which uses `certifi`.

Local pytest: 96 passed. Two query-span tests returned 500 because this workstation's Application Default Credentials need `gcloud auth application-default login`. The deployed service listed GCS objects during startup, so the Cloud Run service account is authenticated. GitHub Actions on `main` was already failing before this update.

uv 0.11.13 wrote `uv.lock` and is the `uv` binary copied into the image.

---

## agrishield-dashboard-web

Cloudflare Pages, `https://agrishield.landmanager.io`. A request on 26 October returned HTTP 200. That deployment is still the 28 July 2026 commit `86eb23b`. Pages builds from `main`. These lockfile changes are local until they are committed and pushed.

`pnpm audit --prod` reports no known vulnerabilities after the update. The production dependency that had a fix available inside the existing major was React Router. It moved from 7.15.0 to 7.18.4. The published fixes for the route-matching denial of service and the related Router advisories start at 7.18.0 and 7.18.2.

Also brought forward inside the ranges already declared in `package.json`:

| Package | Was | Now |
|---------|-----|-----|
| react / react-dom | 19.2.6 | 19.3.1 |
| recharts | 3.8.1 | 3.10.1 |
| swr | 2.4.1 | 2.5.1 |
| tailwindcss and @tailwindcss/vite | 4.3.0 | 4.3.3 |
| postcss | 8.5.14 | 8.5.31 |
| typescript-eslint | 8.59.3 | 8.72.0 |
| autoprefixer | 10.5.0 | 10.6.1 |

CI now uses Node 22 and pnpm 11. Node 20 left maintenance in April 2026. The workstation Node is 22.17.1. Local lint, typecheck, 111 tests, and the production build passed.

Not moved to a new major, because the fixes are in the dev server and test runner rather than the Pages bundle:

| Package | Staying on | Current major | Remaining advisories |
|---------|------------|---------------|----------------------|
| vite | 5.4.21 | 8.3.5 | Dev-server issues patched from Vite 6.4.4 |
| vitest | 2.1.9 | 5.0.5 | UI server and tinypool advisories. The dashboard does not run the Vitest UI |
| typescript | 5.9.3 | 7.0.2 | No production advisory |
| eslint | 9.39.5 | 10.13.0 | 9.39.5 is the last 9.x and is marked unsupported upstream |
| lucide-react | 0.460.0 | 1.61.0 | Icon package major |

---

## agrishield-edge-worker

Hosted at `https://agrishield-edge.landmanager.io`. Deployed 26 October 2026, 13:16 CDT, from the gripfast.com Cloudflare account that owns this zone. Version ID `803e6856-1d43-45f7-b633-b9ce691e75e0`. `GET /health` returned `{"status":"ok"}`. The dashboard API's next poll returned 4 envelopes in 644 ms with no consecutive failures. Existing KV bindings and secrets were left in place.

Dependency changes, with tests passing (67 tests):

| Package | Was | Now |
|---------|-----|-----|
| hono | 4.12.27 | 4.13.14 |
| zod | 3.25.76 | 4.6.7 |
| wrangler | 4.106.0 | 4.153.0 |
| workerd pulled in by that wrangler | 1.20260630.1 | 1.20261023.1 |

Zod 4.6.6 is the first release that fixes the memory-exhaustion advisory on constrained strings and collections (`GHSA-mrhx-c7xc-m3w5`). The ingest schema uses `.max()` on untrusted envelope fields, so the Worker source now imports Zod 4. `z.record` takes a key schema and a value schema. The KV list cursor is passed as `string | null`, which matches the current Workers types.

`npm audit --omit=dev` reports no known vulnerabilities in the production dependencies. The remaining critical findings are in Vitest's tinypool, inside the test toolchain. `@cloudflare/vitest-pool-workers` stays on 0.5.41 because 0.23.0 is a breaking test-runner upgrade. Vitest stays pinned at 2.1.9. `compatibility_date` stays `2026-05-01`.

`pnpm-workspace.yaml` allows the `esbuild` and `workerd` install scripts so a later install can build the Workers runtime. Both `pnpm-lock.yaml` and `package-lock.json` were refreshed. The README's install path is npm. The tests were run with pnpm. The deploy used `pnpm exec wrangler deploy`.

---

## build-dashboard

This folder is a local reference set. It is not a git repo and it has no service, container, or package lockfile. The metadata compiler in `tools/build_metadata.py` uses the Python standard library and PyYAML. PyYAML 6.0.3 is the current release on PyPI. Nothing was deployed and no files in this folder were changed.
