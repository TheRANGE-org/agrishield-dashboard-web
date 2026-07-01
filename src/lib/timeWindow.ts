// ─── Time window type ─────────────────────────────────────────────────────────

export type TimeWindow = "1h" | "4h" | "24h" | "7d" | "30d";

/** Rolling presets or a 30-day slice beyond the last 30 days (0 = 31–60d ago). */
export type ChartTimeSelection =
  | { kind: "preset"; window: TimeWindow }
  | { kind: "historical"; periodIndex: number };

/** Max historical 30d slices (aligned with API gcs_query_max_history_days=365). */
export const MAX_HISTORICAL_PERIODS = 11;

const SECONDS_PER_DAY = 86400;

// ─── Time axis formatter ──────────────────────────────────────────────────────

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Formats a unix-seconds timestamp for a chart x-axis tick, adapted to the
 * selected time window.
 *
 * - 1h, 4h  → "HH:MM"
 * - 24h     → "HH:MM" (always; day boundary shown by context)
 * - 7d      → "MMM D" (e.g. "May 7")
 * - 30d     → "MMM D"
 */
export function formatTimeForWindow(unixSeconds: number, window: TimeWindow): string {
  const ms = unixSeconds * 1000;
  if (window === "7d" || window === "30d") {
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
export function formatTooltipTime(unixSeconds: number, window: TimeWindow): string {
  const ms = unixSeconds * 1000;
  if (window === "7d" || window === "30d") {
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

// ─── Query builder ────────────────────────────────────────────────────────────

interface WindowQueryParams {
  window?: string;
  start_ts?: number;
  end_ts?: number;
  bucket?: string;
  agg: string;
}

export function historicalPeriodBounds(periodIndex: number, nowSec?: number): {
  start_ts: number;
  end_ts: number;
} {
  const now = nowSec ?? Math.floor(Date.now() / 1000);
  const end_ts = now - 30 * SECONDS_PER_DAY * (periodIndex + 1);
  const start_ts = end_ts - 30 * SECONDS_PER_DAY;
  return { start_ts, end_ts };
}

export function formatHistoricalPeriodLabel(periodIndex: number, nowSec?: number): string {
  const { start_ts, end_ts } = historicalPeriodBounds(periodIndex, nowSec);
  const fmt = new Intl.DateTimeFormat(undefined, {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${fmt.format(start_ts * 1000)} – ${fmt.format(end_ts * 1000)}`;
}

export function canGoToOlderHistoricalPeriod(periodIndex: number | null): boolean {
  const next = periodIndex === null ? 0 : periodIndex + 1;
  return next < MAX_HISTORICAL_PERIODS;
}

/**
 * Window used for chart axis formatting (historical slices use 30d-style ticks).
 */
export function chartAxisWindow(selection: ChartTimeSelection): TimeWindow {
  if (selection.kind === "historical") return "30d";
  return selection.window;
}

export function selectionCacheKey(selection: ChartTimeSelection): string {
  if (selection.kind === "historical") return `hist:${selection.periodIndex}`;
  return selection.window;
}

/**
 * Maps a ChartTimeSelection to the correct /api/query params.
 */
export function selectionToQueryParams(selection: ChartTimeSelection): WindowQueryParams {
  if (selection.kind === "historical") {
    const { start_ts, end_ts } = historicalPeriodBounds(selection.periodIndex);
    return { start_ts, end_ts, bucket: "1h", agg: "auto" };
  }
  return windowToQueryParams(selection.window);
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
    case "30d":
      return {
        start_ts: now - 30 * SECONDS_PER_DAY,
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
