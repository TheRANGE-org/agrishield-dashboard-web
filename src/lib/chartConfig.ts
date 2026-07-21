// ─── Reference-range color resolution ────────────────────────────────────────

/**
 * Derives a chart color for a reference-range key name.
 * Rules (order matters — first match wins):
 *   "warning" | "critical" | "dangerous" | "threshold" → red
 *   "comfort"  | "baseline" | "nominal"  | "clean"     → green
 *   "elevated" | "high"     | "peak"                  → orange
 *   everything else                                   → gray
 */
export function referenceRangeColor(key: string): string {
  const lower = key.toLowerCase();
  if (/warning|critical|dangerous|threshold/.test(lower)) return "#ef4444"; // red-500
  if (/comfort|baseline|nominal|clean/.test(lower)) return "#22c55e"; // green-500
  if (/elevated|high|peak/.test(lower)) return "#f97316"; // orange-500
  return "#94a3b8"; // slate-400
}

// ─── Deterministic metric line colors ────────────────────────────────────────

/**
 * Small palette of visually distinct, accessible colors.
 * Assigned by stable index so the same metric always gets the same color.
 */
const METRIC_PALETTE = [
  "#2563eb", // blue-600
  "#16a34a", // green-600
  "#dc2626", // red-600
  "#9333ea", // purple-600
  "#0891b2", // cyan-700
  "#ea580c", // orange-600
  "#0d9488", // teal-600
  "#db2777", // pink-600
  "#65a30d", // lime-600
  "#7c3aed", // violet-600
  "#b45309", // amber-700
  "#0e7490", // sky-700
];

// Stable index by metric name using a simple hash
function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function metricLineColor(metricName: string): string {
  return METRIC_PALETTE[hashCode(metricName) % METRIC_PALETTE.length];
}

// ─── Named overrides for well-known metrics ───────────────────────────────────
// Keeps the "paired" avg/peak visually consistent.

const METRIC_COLOR_OVERRIDES: Record<string, string> = {
  bme688_temperature_c: "#2563eb",
  bme688_humidity_pct: "#0891b2",
  sps30_pm2_5: "#dc2626",
  sps30_pm2_5_max: "#dc2626",
  scd41_co2_ppm: "#9333ea",
  scd41_co2_ppm_max: "#9333ea",
  weather_kit_anemometer_wind_gust_ms_max: "#0d9488",
  weather_kit_anemometer_wind_gust_ms: "#0d9488",
  weather_kit_rain_gauge_rain_interval_mm: "#2563eb",
  weather_kit_rain_gauge_rain_hourly_mm: "#2563eb",
};

export function metricColor(metricName: string): string {
  return METRIC_COLOR_OVERRIDES[metricName] ?? metricLineColor(metricName);
}
