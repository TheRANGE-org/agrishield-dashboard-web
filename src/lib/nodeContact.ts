import type { FleetNode } from "../api/types";
import { formatDateTime, formatSecondsSince, formatUptime } from "./format";

export interface NodeContactInfo {
  /** Unix seconds of most recent reading or telemetry. */
  lastContactTs: number | null;
  /** Unix seconds when the node last booted (derived from uptime). */
  lastRestartTs: number | null;
  uptimeSeconds: number | null;
}

/**
 * Derives last-contact and last-restart times from fleet node payloads.
 * Restart is estimated from system_health_system_uptime_s or registration uptime.
 */
export function getNodeContactInfo(
  node: FleetNode,
  nowSec: number
): NodeContactInfo {
  const readingTs = node.latest_reading?.ts ?? 0;
  const telemetryTs = node.latest_telemetry?.ts ?? 0;
  const lastContactTs =
    readingTs > 0 || telemetryTs > 0 ? Math.max(readingTs, telemetryTs) : null;

  const tv = node.latest_telemetry?.values ?? {};
  const uptimeFromTelemetry = tv["system_health_system_uptime_s"];
  const uptimeSeconds =
    typeof uptimeFromTelemetry === "number"
      ? uptimeFromTelemetry
      : node.registration?.uptime_seconds ?? null;

  const lastRestartTs =
    uptimeSeconds !== null && uptimeSeconds >= 0
      ? nowSec - uptimeSeconds
      : null;

  return { lastContactTs, lastRestartTs, uptimeSeconds };
}

export function formatContactSummary(
  info: NodeContactInfo,
  nowMs: number
): {
  lastContactAt: string;
  lastContactAgo: string;
  lastRestartAt: string | null;
  lastRestartAgo: string | null;
  uptimeLabel: string | null;
} {
  return {
    lastContactAt:
      info.lastContactTs !== null
        ? formatDateTime(info.lastContactTs)
        : "No contact recorded",
    lastContactAgo:
      info.lastContactTs !== null
        ? formatSecondsSince(nowMs, info.lastContactTs)
        : "—",
    lastRestartAt:
      info.lastRestartTs !== null ? formatDateTime(info.lastRestartTs) : null,
    lastRestartAgo:
      info.lastRestartTs !== null
        ? formatSecondsSince(nowMs, info.lastRestartTs)
        : null,
    uptimeLabel:
      info.uptimeSeconds !== null ? formatUptime(info.uptimeSeconds) : null,
  };
}

/** Field setup app URL (Tailscale or mDNS). */
export function nodeSetupUrl(node: FleetNode): string {
  const host = node.registration?.hostname ?? node.nodeId;
  return `https://${host}.local:8000/setup`;
}
