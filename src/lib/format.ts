import type { MetricMetadata } from "../api/types";

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Formats a unix-seconds timestamp as a local time string.
 * e.g. "2:47:03 PM"
 */
export function formatTime(unixSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(unixSeconds * 1000);
}

/**
 * Formats a unix-seconds timestamp as a local date + time string.
 * e.g. "May 12, 2:47 PM"
 */
export function formatDateTime(unixSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(unixSeconds * 1000);
}

/**
 * Returns a human-readable "time ago" string from two timestamps.
 * @param nowMs  Current time in milliseconds (from useTicker)
 * @param ts     Event timestamp in unix seconds
 */
export function formatSecondsSince(nowMs: number, ts: number): string {
  const seconds = Math.floor(nowMs / 1000 - ts);
  if (seconds < 0) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Formats a metric value using catalog metadata for units.
 */
export function formatMetricValue(
  value: number | string | boolean | null | undefined,
  metric: MetricMetadata
): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "✓" : "✗";
  // Numeric
  const formatted = Number.isInteger(value)
    ? value.toString()
    : value.toFixed(2);
  return metric.unit ? `${formatted} ${metric.unit}` : formatted;
}

/**
 * Formats latitude/longitude for display on fleet tiles.
 * Returns null when either coordinate is missing.
 */
export function formatCoordinates(
  lat: number | null,
  lng: number | null
): string | null {
  if (lat === null || lng === null) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Formats an uptime in seconds to a human-readable string.
 * e.g. "7d 4h" or "3h 12m" or "42s"
 */
export function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `${d}d ${h}h`;
}
