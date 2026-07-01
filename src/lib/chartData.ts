import type { QueryResponse } from "../api/query";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataPoint {
  ts: number; // unix seconds
  value: number | null;
}

/** Map of metricName → time-series array, ready for Recharts. */
export type MetricSeriesMap = Record<string, DataPoint[]>;

// ─── Transformer ──────────────────────────────────────────────────────────────

/**
 * Converts a columnar query response into per-metric time series.
 *
 * Input:
 *   { columns: ["ts", "nodeId", "siteId", "bme688_temperature_c", ...], rows: [...] }
 *
 * Output:
 *   { bme688_temperature_c: [{ts, value}, ...], ... }
 *
 * Null / missing values are preserved as `null` (Recharts renders them as gaps).
 * The `ts` column is always required; other fixed columns (nodeId, siteId) are
 * skipped. All remaining columns are treated as metrics.
 */
export function transformQueryResponse(response: QueryResponse): MetricSeriesMap {
  const { columns, rows } = response;

  const SKIP = new Set(["ts", "nodeId", "siteId"]);
  const tsIdx = columns.indexOf("ts");

  if (tsIdx === -1) return {};

  // Build column index map for metric columns only
  const metricCols: { name: string; idx: number }[] = [];
  for (let c = 0; c < columns.length; c++) {
    if (!SKIP.has(columns[c])) {
      metricCols.push({ name: columns[c], idx: c });
    }
  }

  // Pre-allocate per-metric arrays
  const result: MetricSeriesMap = {};
  for (const { name } of metricCols) {
    result[name] = [];
  }

  // Linear scan — O(rows × metrics)
  for (const row of rows) {
    const ts = row[tsIdx] as number;
    for (const { name, idx } of metricCols) {
      const raw = row[idx];
      const value = typeof raw === "number" ? raw : null;
      result[name].push({ ts, value });
    }
  }

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the series contains at least one non-null value.
 */
export function hasData(series: DataPoint[]): boolean {
  return series.some((p) => p.value !== null);
}

export interface SeriesCoverage {
  nonNull: number;
  total: number;
}

/** Count non-null points in a series (includes null placeholder buckets). */
export function seriesCoverage(series: DataPoint[]): SeriesCoverage {
  let nonNull = 0;
  for (const p of series) {
    if (p.value !== null) nonNull++;
  }
  return { nonNull, total: series.length };
}

/**
 * Returns a short note when coverage is sparse (e.g. sensor went offline mid-window).
 * Returns null when coverage is good enough not to warn.
 */
export function formatPartialDataNote(coverage: SeriesCoverage): string | null {
  if (coverage.nonNull === 0) return null;
  if (coverage.total === 0) return null;

  const ratio = coverage.nonNull / coverage.total;
  // Sparse: few readings vs buckets, or less than half the series populated.
  if (coverage.nonNull < 10 || ratio < 0.5) {
    const n = coverage.nonNull;
    return `${n} reading${n === 1 ? "" : "s"} in this window — chart may look sparse`;
  }
  return null;
}

/** Best-effort coverage note from one or more series (e.g. paired charts). */
export function partialDataNoteForSeries(
  ...series: DataPoint[][]
): string | null {
  let best: SeriesCoverage | null = null;
  for (const s of series) {
    const cov = seriesCoverage(s);
    if (cov.nonNull === 0) continue;
    if (!best || cov.nonNull > best.nonNull) best = cov;
  }
  return best ? formatPartialDataNote(best) : null;
}
