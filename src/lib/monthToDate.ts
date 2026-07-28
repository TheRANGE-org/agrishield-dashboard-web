import type { DataPoint } from "./chartData";
import {
  MAX_QUERY_SPAN_DAYS,
  formatLocalIsoDate,
  parseLocalIsoDate,
} from "./timeWindow";

const SECONDS_PER_DAY = 86400;

/** Local calendar month start as YYYY-MM-DD. */
export function localMonthStartIso(now: Date = new Date()): string {
  return formatLocalIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

export interface AbsoluteRange {
  startDate: string;
  endDate: string;
}

/**
 * Split an inclusive calendar date range into chunks of at most
 * MAX_QUERY_SPAN_DAYS (API GCS span limit).
 */
export function chunkDateRangeInclusive(
  startDate: string,
  endDate: string,
  maxSpanDays: number = MAX_QUERY_SPAN_DAYS
): AbsoluteRange[] {
  const start = parseLocalIsoDate(startDate);
  const end = parseLocalIsoDate(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }

  const chunks: AbsoluteRange[] = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    const chunkEnd = new Date(cursor);
    chunkEnd.setDate(chunkEnd.getDate() + maxSpanDays - 1);
    if (chunkEnd > end) {
      chunkEnd.setTime(end.getTime());
    }
    chunks.push({
      startDate: formatLocalIsoDate(cursor),
      endDate: formatLocalIsoDate(chunkEnd),
    });
    cursor = new Date(chunkEnd);
    cursor.setDate(cursor.getDate() + 1);
  }
  return chunks;
}

/** Month-start → today (local), chunked for the API span limit. */
export function monthToDateChunks(now: Date = new Date()): AbsoluteRange[] {
  const today = formatLocalIsoDate(now);
  return chunkDateRangeInclusive(localMonthStartIso(now), today);
}

/**
 * Merge two bucketed series by timestamp, summing values at shared timestamps.
 * Nulls are treated as 0 when the other series has a value; both-null → null.
 */
export function mergeSumSeries(
  a: DataPoint[],
  b: DataPoint[]
): DataPoint[] {
  const map = new Map<number, { a: number | null; b: number | null }>();

  for (const p of a) {
    const entry = map.get(p.ts) ?? { a: null, b: null };
    entry.a = p.value;
    map.set(p.ts, entry);
  }
  for (const p of b) {
    const entry = map.get(p.ts) ?? { a: null, b: null };
    entry.b = p.value;
    map.set(p.ts, entry);
  }

  return [...map.entries()]
    .sort((x, y) => x[0] - y[0])
    .map(([ts, { a: av, b: bv }]) => {
      if (av == null && bv == null) return { ts, value: null };
      return { ts, value: (av ?? 0) + (bv ?? 0) };
    });
}

/**
 * Running cumulative sum of non-null values. Null buckets preserve the
 * previous cumulative total (flat line through gaps).
 */
export function cumulativeSumSeries(series: DataPoint[]): DataPoint[] {
  let running = 0;
  let started = false;
  return series.map((p) => {
    if (p.value == null) {
      return { ts: p.ts, value: started ? running : null };
    }
    running += p.value;
    started = true;
    return { ts: p.ts, value: running };
  });
}

/** Concatenate chunk series in time order (dedupe identical timestamps by summing). */
export function concatSeriesChunks(chunks: DataPoint[][]): DataPoint[] {
  if (chunks.length === 0) return [];
  if (chunks.length === 1) return chunks[0];
  let merged: DataPoint[] = [];
  for (const chunk of chunks) {
    merged = mergeSumSeries(merged, chunk);
  }
  return merged;
}

/** Approximate span hint for timeouts (days from month start through today). */
export function monthToDateSpanDays(now: Date = new Date()): number {
  const start = parseLocalIsoDate(localMonthStartIso(now)).getTime();
  const end = parseLocalIsoDate(formatLocalIsoDate(now)).getTime();
  return Math.floor((end - start) / (SECONDS_PER_DAY * 1000)) + 1;
}

/**
 * Format a byte count for chart axes / tooltips (B / KB / MB / GB).
 */
export function formatByteVolume(bytes: number): string {
  const abs = Math.abs(bytes);
  if (abs < 1000) return `${Math.round(bytes)} B`;
  if (abs < 1_000_000) return `${(bytes / 1000).toFixed(1)} KB`;
  if (abs < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}
