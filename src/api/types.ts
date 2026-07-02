// ─── Metric Catalog ─────────────────────────────────────────────────────────

export interface MetricMetadata {
  name: string;
  label: string;
  unit: string | null;
  source: "readings" | "telemetry";
  type: "numeric" | "string" | "boolean";
  default_agg:
    | "raw"
    | "latest"
    | "mean"
    | "min"
    | "max"
    | "sum"
    | "first"
    | "last";
  valid_aggs: string[];
  hazard: boolean;
  pairs_with: string | null;
  reference_ranges: Record<string, number> | null;
  visibility: "primary" | "secondary" | "diagnostic";
  how_to_read: string;
  nullable?: boolean;
}

export interface Catalog {
  schema_version: number;
  metric_count: number;
  summary: {
    by_source: { readings: number; telemetry: number };
    by_visibility: { primary: number; secondary: number; diagnostic: number };
  };
  metrics: Record<string, MetricMetadata>;
}

// ─── Fleet ───────────────────────────────────────────────────────────────────

export interface FleetNode {
  nodeId: string;
  siteId: string;
  latitude: number | null;
  longitude: number | null;
  status: "live" | "stale" | "dead";
  seconds_since_contact: number;
  registration: {
    version?: string;
    uptime_seconds?: number;
    status?: string;
    hostname?: string;
    deployment_id?: string;
  } | null;
  latest_reading: {
    ts: number;
    seconds_since: number;
    values: Record<string, number | string | boolean | null>;
  } | null;
  latest_telemetry: {
    ts: number;
    seconds_since: number;
    values: Record<string, number | string | boolean | null>;
  } | null;
}

export interface FleetResponse {
  ts_unit: "seconds";
  generated_at: number;
  nodes: FleetNode[];
  warning?: string;
}

// ─── Diagnostics ─────────────────────────────────────────────────────────────

export interface DiagnosticsResponse {
  uptime_seconds: number;
  backfill_complete: boolean;
  gcs_backfill_duration_ms?: number;
  last_worker_poll_ts: number | null;
  last_worker_poll_latency_ms: number | null;
  last_worker_poll_envelope_count: number | null;
  consecutive_poll_failures: number;
  frame_versions: { readings: number; telemetry: number; nodes: number };
  frame_rows: {
    readings: { total: number; by_node?: Record<string, number> };
    telemetry: { total: number; by_node?: Record<string, number> };
    nodes: { total: number };
  };
  dedup_stats: { total_seen: number; duplicates_dropped: number };
  gcs_cache: { size: number; hits: number; misses: number; hit_rate: number };
  query_path: {
    total_queries: number;
    in_memory_only: number;
    gcs_only: number;
    mixed: number;
    errors_400: number;
    p50_latency_ms: number | null;
    p95_latency_ms: number | null;
    p99_latency_ms: number | null;
  };
  memory_rss_mb: number;
}
