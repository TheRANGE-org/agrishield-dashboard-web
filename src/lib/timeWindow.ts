// ─── Time window type ─────────────────────────────────────────────────────────

export type TimeWindow = "1h" | "6h" | "24h" | "7d" | "30d";

// ─── Time axis formatter ──────────────────────────────────────────────────────

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Formats a unix-seconds timestamp for a chart x-axis tick, adapted to the
 * selected time window.
 *
 * - 1h, 6h  → "HH:MM"
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
  // 1h, 6h, 24h → HH:MM
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
  // 1h, 6h
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

/**
 * Maps a TimeWindow to the correct /api/query params.
 * 7d and 30d use bucket=1h with agg=auto (catalog-driven per-metric agg).
 * Shorter windows use raw data (no bucket).
 */
export function windowToQueryParams(tw: TimeWindow): WindowQueryParams {
  const now = Math.floor(Date.now() / 1000);
  switch (tw) {
    case "1h":
      return { window: "1h", agg: "raw" };
    case "6h":
      return { window: "6h", agg: "raw" };
    case "24h":
      return { window: "24h", agg: "raw" };
    case "7d":
      return {
        start_ts: now - 7 * 86400,
        end_ts: now,
        bucket: "1h",
        agg: "auto",
      };
    case "30d":
      return {
        start_ts: now - 30 * 86400,
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
