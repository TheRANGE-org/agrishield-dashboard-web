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

interface SensorHealthCounts {
  healthy: number;
  total: number;
}

/**
 * Computes "X/Y healthy" from telemetry values.
 * A sensor is counted as initialized if its is_initialized flag is true.
 * It's "healthy" if initialized AND error_count === 0.
 */
export function computeSensorHealth(
  values: Record<string, number | string | boolean | null>
): SensorHealthCounts {
  const sensors = [
    { init: "sensor_health_sps30_is_initialized", errors: "sensor_health_sps30_error_count" },
    { init: "sensor_health_scd41_is_initialized", errors: "sensor_health_scd41_error_count" },
  ];

  let healthy = 0;
  let total = 0;

  for (const s of sensors) {
    const initialized = values[s.init];
    if (initialized === true) {
      total++;
      const errorCount = values[s.errors];
      if (typeof errorCount === "number" && errorCount === 0) {
        healthy++;
      }
    }
  }

  return { healthy, total };
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
