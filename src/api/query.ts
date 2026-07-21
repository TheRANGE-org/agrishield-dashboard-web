import { apiFetch } from "./client";

// ─── Request / Response types ─────────────────────────────────────────────────

export interface QueryRequest {
  source: "readings" | "telemetry";
  node_ids?: string[];
  site_ids?: string[];
  metrics?: string[];
  window?: string;
  start_ts?: number;
  end_ts?: number;
  agg: string;
  bucket?: string;
  shape?: "wide" | "long" | "latest_per_node";
  limit?: number;
}

/**
 * Columnar JSON response for agg≠raw queries.
 * columns: ["ts", "nodeId", "siteId", ...metricNames]
 * rows:    [ts, nodeId, siteId, ...values][]
 */
export interface QueryResponse {
  query: Record<string, unknown>;
  ts_unit: "seconds";
  columns: string[];
  rows: (number | string | null)[][];
  resolved_aggs?: Record<string, string>;
  truncated_at?: number | null;
}

// ─── Client ───────────────────────────────────────────────────────────────────

/**
 * POST /api/query — columnar JSON response (agg≠raw).
 * Phase 4 only uses this path; NDJSON (agg=raw) is handled by apiFetchNdjson
 * in client.ts if ever needed.
 */
export async function fetchQuery(
  query: QueryRequest,
  options?: { timeoutMs?: number }
): Promise<QueryResponse> {
  return apiFetch<QueryResponse>("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
    timeoutMs: options?.timeoutMs,
  });
}
