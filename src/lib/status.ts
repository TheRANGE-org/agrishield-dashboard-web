import { formatAgeSecondsAgo } from "./format";

export type NodeStatus = "live" | "stale" | "dead";

/**
 * Derives node status from seconds since contact.
 * The backend computes this too, but the frontend recomputes on each ticker
 * tick so that status transitions happen in real-time between polls.
 *
 * live:  < 5 minutes (300s)
 * stale: 5–30 minutes (300–1800s)
 * dead:  > 30 minutes (1800s+)
 */
export function computeStatus(secondsSinceContact: number): NodeStatus {
  if (secondsSinceContact < 300) return "live";
  if (secondsSinceContact < 1800) return "stale";
  return "dead";
}

// ─── Battery ─────────────────────────────────────────────────────────────────

export type BatteryStatus = "good" | "fair" | "low" | "unknown";

export function parseBatteryStatus(raw: string | null | undefined): BatteryStatus {
  if (!raw) return "unknown";
  const lower = raw.toLowerCase();
  if (lower === "good") return "good";
  if (lower === "fair") return "fair";
  if (lower === "low") return "low";
  return "unknown";
}

export function batteryStatusColor(status: BatteryStatus): string {
  switch (status) {
    case "good":
      return "text-green-700";
    case "fair":
      return "text-amber-600";
    case "low":
      return "text-red-600";
    default:
      return "text-slate-400";
  }
}

// ─── Sensor health ────────────────────────────────────────────────────────────

export type SensorHealthSeverity = "healthy" | "degraded" | "unhealthy";

export interface SensorHealthDetail {
  label: string;
  severity: SensorHealthSeverity;
  /** Short label for fleet pill, e.g. "SPS30 (stale)". */
  pillLabel: string;
  /** Longer explanation for tooltips / node detail. */
  detail: string;
  errorCount: number;
  isStale: boolean;
  /** Seconds since last successful hardware read (from firmware last_ok_ts). */
  lastOkAgeSec: number | null;
  /** SPS30 auto re-init count since service start, when available. */
  autoReinitCount: number | null;
}

export interface SensorHealthResult {
  healthy: number;
  total: number;
  overallSeverity: SensorHealthSeverity;
  details: SensorHealthDetail[];
  /** Short combined labels for compact fleet display. */
  unhealthyLabels: string[];
  telemetryAgeSeconds: number | null;
}

const MONITORED_SENSORS = [
  {
    label: "SPS30",
    init: "sensor_health_sps30_is_initialized",
    errors: "sensor_health_sps30_error_count",
    lastOk: "sensor_health_sps30_last_ok_ts",
    autoReinit: "sensor_health_sps30_auto_reinit_count",
    readingMetrics: ["sps30_pm2_5"],
  },
  {
    label: "SCD41",
    init: "sensor_health_scd41_is_initialized",
    errors: "sensor_health_scd41_error_count",
    lastOk: "sensor_health_scd41_last_ok_ts",
    readingMetrics: ["scd41_co2_ppm"],
  },
] as const;

/** Age of last_ok_ts beyond which a sensor is treated as stale. */
export const LAST_OK_STALE_SEC = 600;

export interface ComputeSensorHealthOptions {
  /** Sensor type labels with flat-line readings (e.g. "SPS30"). */
  staleSensors?: Set<string>;
  /** Unix seconds of latest telemetry envelope. */
  telemetryTs?: number | null;
  /** Current time in unix seconds (for telemetry age). */
  nowSec?: number;
  readingValues?: Record<string, number | string | boolean | null>;
}

function severityRank(s: SensorHealthSeverity): number {
  if (s === "unhealthy") return 2;
  if (s === "degraded") return 1;
  return 0;
}

function formatErrorDetail(label: string, errorCount: number, isStale: boolean): string {
  const errPhrase =
    errorCount === 1
      ? "1 error since last OK read"
      : `${errorCount.toLocaleString()} errors since last OK read`;
  if (isStale && errorCount > 0) return `${label} (stale, ${errPhrase})`;
  if (isStale) return `${label} (stale)`;
  if (errorCount > 0) return `${label} (${errPhrase})`;
  return label;
}

/**
 * Computes per-sensor health from telemetry plus optional stale-reading hints.
 *
 * - **healthy** — initialized, no errors, reading not stale
 * - **degraded** — errors since last OK read but reading still changing, or minor fault
 * - **unhealthy** — stale reading and/or persistent errors with flat data
 */
export function computeSensorHealth(
  values: Record<string, number | string | boolean | null>,
  options: ComputeSensorHealthOptions = {}
): SensorHealthResult {
  const staleSensors = options.staleSensors ?? new Set<string>();
  const nowSec = options.nowSec ?? Math.floor(Date.now() / 1000);
  const telemetryAgeSeconds =
    options.telemetryTs != null && options.telemetryTs > 0
      ? Math.max(0, nowSec - options.telemetryTs)
      : null;

  let healthy = 0;
  let total = 0;
  let overallSeverity: SensorHealthSeverity = "healthy";
  const details: SensorHealthDetail[] = [];
  const unhealthyLabels: string[] = [];

  for (const sensor of MONITORED_SENSORS) {
    const initialized = values[sensor.init];
    if (initialized !== true) continue;

    total++;
    const errorCount =
      typeof values[sensor.errors] === "number"
        ? (values[sensor.errors] as number)
        : 0;
    const lastOkTs =
      typeof values[sensor.lastOk] === "number"
        ? (values[sensor.lastOk] as number)
        : null;
    const lastOkAgeSec =
      lastOkTs != null ? Math.max(0, nowSec - lastOkTs) : null;
    const autoReinitCount =
      "autoReinit" in sensor
        ? typeof values[sensor.autoReinit] === "number"
          ? (values[sensor.autoReinit] as number)
          : 0
        : null;
    const isLastOkStale =
      lastOkAgeSec != null && lastOkAgeSec > LAST_OK_STALE_SEC;
    const isStale = staleSensors.has(sensor.label) || isLastOkStale;

    const hasReading = sensor.readingMetrics.some((m) => {
      const v = options.readingValues?.[m];
      return typeof v === "number";
    });

    let severity: SensorHealthSeverity = "healthy";
    if (isStale || (errorCount > 0 && !hasReading)) {
      severity = "unhealthy";
    } else if (errorCount > 0 || (autoReinitCount != null && autoReinitCount >= 3)) {
      severity = "degraded";
    }

    if (severity === "healthy") {
      healthy++;
    } else {
      const pillLabel = formatErrorDetail(sensor.label, errorCount, isStale);
      unhealthyLabels.push(pillLabel);
    }

    const detailParts: string[] = [];
    if (isStale) {
      detailParts.push(
        isLastOkStale && !staleSensors.has(sensor.label)
          ? `no successful read for ${formatAgeSecondsAgo(lastOkAgeSec!)}`
          : "reading unchanged for 3+ minutes"
      );
    }
    if (errorCount > 0) {
      detailParts.push(
        errorCount === 1
          ? "1 read error since last successful sample"
          : `${errorCount.toLocaleString()} read errors since last successful sample`
      );
    }
    if (detailParts.length === 0) detailParts.push("operating normally");

    details.push({
      label: sensor.label,
      severity,
      pillLabel: formatErrorDetail(sensor.label, errorCount, isStale),
      detail: detailParts.join("; "),
      errorCount,
      isStale,
      lastOkAgeSec,
      autoReinitCount,
    });

    if (severityRank(severity) > severityRank(overallSeverity)) {
      overallSeverity = severity;
    }
  }

  return {
    healthy,
    total,
    overallSeverity,
    details,
    unhealthyLabels,
    telemetryAgeSeconds,
  };
}

// ─── Pi throttling (vcgencmd get_throttled) ───────────────────────────────────

const THROTTLE_FLAG_BITS = [
  { bit: 0, label: "Undervoltage detected", current: true },
  { bit: 1, label: "ARM frequency capped", current: true },
  { bit: 2, label: "Currently throttled", current: true },
  { bit: 3, label: "Soft temperature limit active", current: true },
  { bit: 16, label: "Undervoltage since boot", current: false },
  { bit: 17, label: "ARM frequency capped since boot", current: false },
  { bit: 18, label: "Throttled since boot", current: false },
  { bit: 19, label: "Soft temperature limit since boot", current: false },
] as const;

export type ThrottleSeverity = "none" | "info" | "critical";

export interface DecodedThrottledState {
  isHealthy: boolean;
  severity: ThrottleSeverity;
  raw: string;
  currentIssues: string[];
  historicalIssues: string[];
  /** Short text for badges. */
  shortLabel: string;
  /** Full explanation for system health panel. */
  summary: string;
}

/**
 * Decodes Raspberry Pi `vcgencmd get_throttled` hex bitmask.
 * Bits 0–3 are active conditions; bits 16–19 are historical since boot.
 */
export function decodePiThrottledState(
  raw: string | null | undefined
): DecodedThrottledState {
  const empty: DecodedThrottledState = {
    isHealthy: true,
    severity: "none",
    raw: raw ?? "0x0",
    currentIssues: [],
    historicalIssues: [],
    shortLabel: "OK",
    summary: "No throttling or power issues reported.",
  };

  if (!raw || raw === "0x0" || raw === "0") {
    return empty;
  }

  const parsed = Number.parseInt(raw.replace(/^0x/i, ""), 16);
  if (Number.isNaN(parsed)) {
    return {
      isHealthy: false,
      severity: "info",
      raw,
      currentIssues: [],
      historicalIssues: [`Unknown throttled state: ${raw}`],
      shortLabel: raw,
      summary: `Unrecognized throttled state value: ${raw}`,
    };
  }

  const currentIssues: string[] = [];
  const historicalIssues: string[] = [];

  for (const { bit, label, current } of THROTTLE_FLAG_BITS) {
    if ((parsed & (1 << bit)) !== 0) {
      (current ? currentIssues : historicalIssues).push(label);
    }
  }

  const severity: ThrottleSeverity =
    currentIssues.length > 0 ? "critical" : "info";

  let shortLabel: string;
  if (currentIssues.length > 0) {
    shortLabel = currentIssues[0];
  } else if (historicalIssues.length > 0) {
    shortLabel = `Past issue: ${historicalIssues[0]}`;
  } else {
    shortLabel = raw;
  }

  const parts: string[] = [];
  if (currentIssues.length > 0) {
    parts.push(`Active: ${currentIssues.join("; ")}`);
  }
  if (historicalIssues.length > 0) {
    parts.push(`Since boot: ${historicalIssues.join("; ")}`);
  }

  return {
    isHealthy: false,
    severity,
    raw,
    currentIssues,
    historicalIssues,
    shortLabel,
    summary: parts.join(". ") || raw,
  };
}

// ─── Connectivity warnings ────────────────────────────────────────────────────

export interface ConnectivityWarning {
  tailscaleDown: boolean;
  wifiPoor: boolean;
}

const WIFI_POOR_THRESHOLD_DBM = -75;
const WIFI_POOR_QUALITY_THRESHOLD = 30;

export function computeConnectivityWarning(
  values: Record<string, number | string | boolean | null>
): ConnectivityWarning {
  const tailscaleState = values["system_health_tailscale_backend_state"];
  const wifiSignal = values["system_health_wifi_signal_level_dbm"];
  const wifiQuality = values["system_health_wifi_link_quality"];

  const tailscaleDown =
    typeof tailscaleState === "string" && tailscaleState !== "Running";

  const wifiPoor =
    (typeof wifiSignal === "number" && wifiSignal < WIFI_POOR_THRESHOLD_DBM) ||
    (typeof wifiQuality === "number" && wifiQuality < WIFI_POOR_QUALITY_THRESHOLD);

  return { tailscaleDown, wifiPoor };
}
