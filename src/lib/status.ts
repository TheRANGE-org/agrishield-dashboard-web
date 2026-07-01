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

export interface SensorHealthResult {
  healthy: number;
  total: number;
  /** Human-readable labels for initialized sensors that are unhealthy. */
  unhealthyLabels: string[];
}

const MONITORED_SENSORS = [
  {
    label: "SPS30",
    init: "sensor_health_sps30_is_initialized",
    errors: "sensor_health_sps30_error_count",
  },
  {
    label: "SCD41",
    init: "sensor_health_scd41_is_initialized",
    errors: "sensor_health_scd41_error_count",
  },
] as const;

/**
 * Computes "X/Y healthy" from telemetry values.
 * A sensor is counted as initialized if its is_initialized flag is true.
 * It's "healthy" if initialized AND error_count === 0.
 */
export function computeSensorHealth(
  values: Record<string, number | string | boolean | null>
): SensorHealthResult {
  let healthy = 0;
  let total = 0;
  const unhealthyLabels: string[] = [];

  for (const sensor of MONITORED_SENSORS) {
    const initialized = values[sensor.init];
    if (initialized === true) {
      total++;
      const errorCount = values[sensor.errors];
      if (typeof errorCount === "number" && errorCount === 0) {
        healthy++;
      } else {
        const err =
          typeof errorCount === "number" ? ` (${errorCount} errors)` : "";
        unhealthyLabels.push(`${sensor.label}${err}`);
      }
    }
  }

  return { healthy, total, unhealthyLabels };
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
