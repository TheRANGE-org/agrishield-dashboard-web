import { useDiagnostics } from "../../hooks/useDiagnostics";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import { formatUptime, formatDateTime } from "../../lib/format";

export default function DiagnosticsView() {
  const { diagnostics: d, isLoading, error } = useDiagnostics();

  if (isLoading) return <LoadingState message="Loading diagnostics…" />;
  if (error || !d)
    return (
      <ErrorState
        message="Unable to load diagnostics"
        detail={error?.message}
      />
    );

  const pollFailed = d.consecutive_poll_failures > 0;
  const backfillPending = !d.backfill_complete;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Diagnostics</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Operator view · auto-refreshes every 30s
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* ── Service health ─────────────────────────────────────── */}
        <DiagCard title="Service Health">
          <KV label="Uptime" value={formatUptime(d.uptime_seconds)} />
          <KV
            label="Backfill"
            value={d.backfill_complete ? "Complete" : "Pending…"}
            valueClass={backfillPending ? "text-amber-600" : "text-green-700"}
          />
          {d.gcs_backfill_duration_ms != null && (
            <KV
              label="Backfill duration"
              value={`${d.gcs_backfill_duration_ms} ms`}
            />
          )}
          <KV label="Memory" value={`${d.memory_rss_mb.toFixed(1)} MB RSS`} />
        </DiagCard>

        {/* ── Worker polling ─────────────────────────────────────── */}
        <DiagCard title="Worker Polling">
          <KV
            label="Last poll"
            value={
              d.last_worker_poll_ts
                ? formatDateTime(d.last_worker_poll_ts)
                : "Never"
            }
          />
          <KV
            label="Latency"
            value={
              d.last_worker_poll_latency_ms != null
                ? `${d.last_worker_poll_latency_ms} ms`
                : "—"
            }
          />
          <KV
            label="Envelopes (last)"
            value={
              d.last_worker_poll_envelope_count != null
                ? String(d.last_worker_poll_envelope_count)
                : "—"
            }
          />
          <KV
            label="Consecutive failures"
            value={String(d.consecutive_poll_failures)}
            valueClass={pollFailed ? "text-red-600 font-semibold" : "text-green-700"}
          />
        </DiagCard>

        {/* ── Frame state ────────────────────────────────────────── */}
        <DiagCard title="Frame State">
          <KV
            label="Readings rows"
            value={`${d.frame_rows.readings.total.toLocaleString()} total`}
          />
          {d.frame_rows.readings.by_node &&
            Object.entries(d.frame_rows.readings.by_node).map(
              ([nodeId, count]) => (
                <KV key={nodeId} label={`  ${nodeId}`} value={String(count)} muted />
              )
            )}
          <KV
            label="Telemetry rows"
            value={`${d.frame_rows.telemetry.total.toLocaleString()} total`}
          />
          {d.frame_rows.telemetry.by_node &&
            Object.entries(d.frame_rows.telemetry.by_node).map(
              ([nodeId, count]) => (
                <KV key={nodeId} label={`  ${nodeId}`} value={String(count)} muted />
              )
            )}
          <KV label="Nodes registered" value={String(d.frame_rows.nodes.total)} />
          <div className="pt-2 border-t border-slate-100 mt-1">
            <span className="text-xs text-slate-400">Frame versions</span>
            <div className="flex gap-4 mt-0.5">
              {Object.entries(d.frame_versions).map(([k, v]) => (
                <span key={k} className="text-xs">
                  <span className="text-slate-400">{k}: </span>
                  <span className="font-medium text-slate-700 tabular-nums">{v}</span>
                </span>
              ))}
            </div>
          </div>
        </DiagCard>

        {/* ── Dedup + GCS ────────────────────────────────────────── */}
        <DiagCard title="Dedup & GCS Cache">
          <KV
            label="Total seen"
            value={d.dedup_stats.total_seen.toLocaleString()}
          />
          <KV
            label="Duplicates dropped"
            value={d.dedup_stats.duplicates_dropped.toLocaleString()}
          />
          <KV
            label="Drop rate"
            value={
              d.dedup_stats.total_seen > 0
                ? `${((d.dedup_stats.duplicates_dropped / d.dedup_stats.total_seen) * 100).toFixed(1)}%`
                : "—"
            }
          />
          <div className="pt-2 border-t border-slate-100 mt-1">
            <span className="text-xs text-slate-400">GCS cache</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
              <KV label="Size" value={String(d.gcs_cache.size)} />
              <KV
                label="Hit rate"
                value={`${(d.gcs_cache.hit_rate * 100).toFixed(1)}%`}
              />
              <KV label="Hits" value={String(d.gcs_cache.hits)} />
              <KV label="Misses" value={String(d.gcs_cache.misses)} />
            </div>
          </div>
        </DiagCard>

        {/* ── Query performance (full-width) ─────────────────────── */}
        <DiagCard title="Query Performance" className="sm:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2">
            <KV label="Total queries" value={String(d.query_path.total_queries)} />
            <KV label="In-memory only" value={String(d.query_path.in_memory_only)} />
            <KV label="GCS only" value={String(d.query_path.gcs_only)} />
            <KV label="Mixed" value={String(d.query_path.mixed)} />
            <KV
              label="400 errors"
              value={String(d.query_path.errors_400)}
              valueClass={d.query_path.errors_400 > 0 ? "text-red-600 font-semibold" : undefined}
            />
            <KV
              label="p50 latency"
              value={d.query_path.p50_latency_ms != null ? `${d.query_path.p50_latency_ms} ms` : "—"}
            />
            <KV
              label="p95 latency"
              value={d.query_path.p95_latency_ms != null ? `${d.query_path.p95_latency_ms} ms` : "—"}
            />
            <KV
              label="p99 latency"
              value={d.query_path.p99_latency_ms != null ? `${d.query_path.p99_latency_ms} ms` : "—"}
            />
          </div>
        </DiagCard>

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DiagCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "bg-white border border-slate-200 rounded-xl p-4 shadow-sm",
        className,
      ].join(" ")}
    >
      <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">
        {title}
      </h2>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function KV({
  label,
  value,
  valueClass,
  muted,
}: {
  label: string;
  value: string;
  valueClass?: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span
        className={[
          "text-xs shrink-0",
          muted ? "text-slate-300" : "text-slate-500",
        ].join(" ")}
      >
        {label}
      </span>
      <span
        className={[
          "text-xs font-medium tabular-nums text-right",
          valueClass ?? "text-slate-800",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
