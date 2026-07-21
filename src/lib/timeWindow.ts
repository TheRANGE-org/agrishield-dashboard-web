// ─── Time window type ─────────────────────────────────────────────────────────

/** Rolling preset chips (all ≤ 7d). Custom calendar ranges are separate. */
export type TimeWindow = "1h" | "4h" | "24h" | "7d";

/** Axis / tooltip formatting style (custom multi-day ranges use "7d"). */
export type AxisWindow = TimeWindow;

/** Rolling presets or an absolute calendar date range (local YYYY-MM-DD). */
export type ChartTimeSelection =
  | { kind: "preset"; window: TimeWindow }
  | { kind: "range"; startDate: string; endDate: string };

/** Max inclusive calendar days for a custom (or absolute) query range. */
export const MAX_QUERY_SPAN_DAYS = 14;

/** Aligns with API gcs_query_max_history_days. */
export const MAX_LOOKBACK_DAYS = 365;

const SECONDS_PER_DAY = 86400;

// ─── Time axis formatter ──────────────────────────────────────────────────────

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Formats a unix-seconds timestamp for a chart x-axis tick, adapted to the
 * selected time window.
 *
 * - 1h, 4h  → "HH:MM"
 * - 24h     → "HH:MM"
 * - 7d (+ custom multi-day) → "MMM D"
 */
export function formatTimeForWindow(unixSeconds: number, window: AxisWindow): string {
  const ms = unixSeconds * 1000;
  if (window === "7d") {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: TZ,
      month: "short",
      day: "numeric",
    }).format(ms);
  }
  // 1h, 4h, 24h → HH:MM
  return new Intl.DateTimeFormat(undefined, {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(ms);
}

/**
 * Full local-time tooltip label: "May 12 14:32" for 24h+, "14:32:07" for shorter.
 */
export function formatTooltipTime(unixSeconds: number, window: AxisWindow): string {
  const ms = unixSeconds * 1000;
  if (window === "7d") {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: TZ,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(ms);
  }
  if (window === "24h") {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: TZ,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(ms);
  }
  // 1h, 4h
  return new Intl.DateTimeFormat(undefined, {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(ms);
}

// ─── Date helpers (local calendar) ────────────────────────────────────────────

/** Today's date as YYYY-MM-DD in the local timezone. */
export function localTodayIso(): string {
  return formatLocalIsoDate(new Date());
}

export function formatLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD as local midnight. */
export function parseLocalIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** Inclusive calendar-day count between two YYYY-MM-DD strings. */
export function inclusiveDaySpan(startDate: string, endDate: string): number {
  const start = parseLocalIsoDate(startDate).getTime();
  const end = parseLocalIsoDate(endDate).getTime();
  return Math.floor((end - start) / (SECONDS_PER_DAY * 1000)) + 1;
}

export type RangeValidation =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Validate a custom calendar range against span, order, future, and lookback.
 */
export function validateDateRange(
  startDate: string,
  endDate: string,
  now: Date = new Date()
): RangeValidation {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return { ok: false, message: "Enter valid start and end dates." };
  }
  const start = parseLocalIsoDate(startDate);
  const end = parseLocalIsoDate(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, message: "Enter valid start and end dates." };
  }
  if (end < start) {
    return { ok: false, message: "End date must be on or after start date." };
  }
  const today = parseLocalIsoDate(formatLocalIsoDate(now));
  if (end > today) {
    return { ok: false, message: "End date cannot be in the future." };
  }
  const span = inclusiveDaySpan(startDate, endDate);
  if (span > MAX_QUERY_SPAN_DAYS) {
    return {
      ok: false,
      message: `Range cannot exceed ${MAX_QUERY_SPAN_DAYS} days (selected ${span}).`,
    };
  }
  const earliest = new Date(today);
  earliest.setDate(earliest.getDate() - (MAX_LOOKBACK_DAYS - 1));
  if (start < earliest) {
    return {
      ok: false,
      message: `Start date cannot be more than ${MAX_LOOKBACK_DAYS} days ago.`,
    };
  }
  return { ok: true };
}

/**
 * Local midnight of startDate → local end-of-day of endDate as unix seconds.
 */
export function rangeToUnixBounds(
  startDate: string,
  endDate: string
): { start_ts: number; end_ts: number } {
  const start = parseLocalIsoDate(startDate);
  const end = parseLocalIsoDate(endDate);
  end.setHours(23, 59, 59, 999);
  return {
    start_ts: Math.floor(start.getTime() / 1000),
    end_ts: Math.floor(end.getTime() / 1000),
  };
}

/** Bucket for absolute ranges: ≤2 inclusive days → 15m, else 1h. */
export function bucketForDateRange(startDate: string, endDate: string): "15m" | "1h" {
  return inclusiveDaySpan(startDate, endDate) <= 2 ? "15m" : "1h";
}

// ─── Query builder ────────────────────────────────────────────────────────────

interface WindowQueryParams {
  window?: string;
  start_ts?: number;
  end_ts?: number;
  bucket?: string;
  agg: string;
}

/**
 * Window used for chart axis formatting.
 * Custom ranges: single day → 24h ticks; multi-day → 7d ticks.
 */
export function chartAxisWindow(selection: ChartTimeSelection): AxisWindow {
  if (selection.kind === "range") {
    return inclusiveDaySpan(selection.startDate, selection.endDate) <= 1 ? "24h" : "7d";
  }
  return selection.window;
}

export function selectionCacheKey(selection: ChartTimeSelection): string {
  if (selection.kind === "range") {
    return `range:${selection.startDate}:${selection.endDate}`;
  }
  return selection.window;
}

/**
 * Maps a ChartTimeSelection to the correct /api/query params.
 */
export function selectionToQueryParams(selection: ChartTimeSelection): WindowQueryParams {
  if (selection.kind === "range") {
    const { start_ts, end_ts } = rangeToUnixBounds(selection.startDate, selection.endDate);
    return {
      start_ts,
      end_ts,
      bucket: bucketForDateRange(selection.startDate, selection.endDate),
      agg: "auto",
    };
  }
  return windowToQueryParams(selection.window);
}

/** 7d presets and custom ranges leave the in-memory ~24h window (GCS). */
export function selectionIsDeepHistory(selection: ChartTimeSelection): boolean {
  if (selection.kind === "range") return true;
  return selection.window === "7d";
}

/** Longer client timeout for GCS-backed windows (p95 can exceed 15s under load). */
export function selectionQueryTimeoutMs(selection: ChartTimeSelection): number {
  return selectionIsDeepHistory(selection) ? 90_000 : 30_000;
}

/**
 * Maps a TimeWindow preset to the correct /api/query params.
 */
export function windowToQueryParams(tw: TimeWindow): WindowQueryParams {
  const now = Math.floor(Date.now() / 1000);
  switch (tw) {
    case "1h":
      return { window: "1h", bucket: "1m", agg: "auto" };
    case "4h":
      return { window: "4h", bucket: "1m", agg: "auto" };
    case "24h":
      return { window: "24h", bucket: "1m", agg: "auto" };
    case "7d":
      return {
        start_ts: now - 7 * SECONDS_PER_DAY,
        end_ts: now,
        bucket: "1h",
        agg: "auto",
      };
  }
}

// ─── Wind direction ───────────────────────────────────────────────────────────

const COMPASS_POINTS = [
  "N", "NNE", "NE", "ENE",
  "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW",
  "W", "WNW", "NW", "NNW",
];

/**
 * Converts compass degrees to a 16-point compass-point label.
 * 0° / 360° → N, 90° → E, etc.
 */
export function degreesToCompassPoint(degrees: number): string {
  const normalized = ((((degrees % 360) + 360) % 360));
  const index = Math.round(normalized / 22.5) % 16;
  return COMPASS_POINTS[index];
}
