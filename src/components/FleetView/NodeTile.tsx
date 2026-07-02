import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Cpu, MapPin, MemoryStick, HardDrive, Thermometer, Zap } from "lucide-react";
import type { FleetNode } from "../../api/types";
import type { Catalog } from "../../api/types";
import {
  computeStatus,
  parseBatteryStatus,
  computeSensorHealth,
  computeConnectivityWarning,
  decodePiThrottledState,
} from "../../lib/status";
import { isSensorLabelStale } from "../../lib/staleReadings";
import { formatCoordinates, formatSecondsSince, formatUptime } from "../../lib/format";
import StatusBadge from "./StatusBadge";
import BatteryIndicator from "./BatteryIndicator";
import SensorHealthPill from "./SensorHealthPill";
import ConditionalBadges from "./ConditionalBadges";

interface NodeTileProps {
  node: FleetNode;
  nowMs: number; // from useTicker
  catalog: Catalog;
  onShowOnMap?: (node: FleetNode) => void;
  staleByNode?: Map<string, Set<string>>;
}

const STATUS_BG: Record<string, string> = {
  live: "bg-white border-slate-200",
  stale: "bg-amber-50/60 border-amber-200",
  dead: "bg-red-50/60 border-red-200",
};

export default function NodeTile({
  node,
  nowMs,
  catalog: _catalog, // eslint-disable-line @typescript-eslint/no-unused-vars
  onShowOnMap,
  staleByNode,
}: NodeTileProps) {
  const [expanded, setExpanded] = useState(false);

  // Recompute status from live ticker so it transitions between polls.
  // Use the most recent contact across reading or telemetry (matches API).
  const lastContactTs = Math.max(
    node.latest_reading?.ts ?? 0,
    node.latest_telemetry?.ts ?? 0,
  );
  const secondsSince =
    lastContactTs > 0
      ? Math.floor(nowMs / 1000 - lastContactTs)
      : node.seconds_since_contact;
  const liveStatus =
    lastContactTs > 0
      ? computeStatus(secondsSince)
      : computeStatus(node.seconds_since_contact ?? Number.MAX_SAFE_INTEGER);

  const telemetryValues = node.latest_telemetry?.values ?? {};
  const readingValues = node.latest_reading?.values ?? {};
  const nowSec = Math.floor(nowMs / 1000);
  const nodeStale = staleByNode?.get(node.nodeId);

  // Battery
  const batteryStatusRaw = telemetryValues["sensor_health_battery_status"];
  const batteryPct = telemetryValues["sensor_health_battery_percentage"];
  const batteryStatus = parseBatteryStatus(
    typeof batteryStatusRaw === "string" ? batteryStatusRaw : null
  );
  const batteryPercentage = typeof batteryPct === "number" ? batteryPct : null;

  // Sensor health
  const sensorHealth = computeSensorHealth(telemetryValues, {
    staleSensors: nodeStale,
    telemetryTs: node.latest_telemetry?.ts,
    nowSec,
    readingValues,
  });

  // Connectivity warnings
  const connectivity = computeConnectivityWarning(telemetryValues);

  // Conditional badge values
  const throttledState = telemetryValues["system_health_rpi_throttled_state"];
  const throttleInfo = decodePiThrottledState(
    typeof throttledState === "string" ? throttledState : null
  );
  const pendingBatches = telemetryValues["system_health_queue_pending_batches"];
  const wifiSignalDbm = telemetryValues["system_health_wifi_signal_level_dbm"];

  // System health details
  const cpuTemp = telemetryValues["system_health_cpu_temperature_c"];
  const memPct = telemetryValues["system_health_memory_usage_percent"];
  const diskPct = telemetryValues["system_health_disk_usage_percent"];
  const cpuUsage = telemetryValues["system_health_cpu_usage_percent"];
  const uptimeSeconds = node.registration?.uptime_seconds ?? null;

  // Primary reading values for display
  const tempC = readingValues["bme688_temperature_c"];
  const humPct = readingValues["bme688_humidity_pct"];
  const pm25 = readingValues["sps30_pm2_5"];
  const co2 = readingValues["scd41_co2_ppm"];
  const coordsLabel = formatCoordinates(node.latitude, node.longitude);
  const hasCoords = coordsLabel !== null;

  const borderClass = STATUS_BG[liveStatus] ?? STATUS_BG.live;

  return (
    <Link
      to={`/nodes/${node.nodeId}`}
      className={[
        "block rounded-xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md hover:ring-2 hover:ring-green-400/50 focus-visible:outline-2 focus-visible:outline-green-600",
        borderClass,
      ].join(" ")}
      aria-label={`Node ${node.nodeId} — view details`}
    >
    <article>
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <StatusBadge status={liveStatus} />
          <h2 className="mt-2 text-base font-semibold text-slate-900 truncate leading-snug">
            {node.nodeId}
          </h2>
          <p className="text-xs text-slate-500 truncate">{node.siteId}</p>
          <div className="mt-1.5 flex items-start gap-1">
            <MapPin
              className="h-3 w-3 text-slate-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <span className="text-xs text-slate-400 block leading-none">
                Location
              </span>
              <span className="text-xs font-medium text-slate-700 tabular-nums block truncate">
                {coordsLabel ?? "Not set"}
              </span>
              {hasCoords && onShowOnMap && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onShowOnMap(node);
                  }}
                  className="mt-0.5 text-xs font-medium text-green-700 hover:text-green-800 hover:underline"
                >
                  Show on map
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Battery top-right */}
        <div className="shrink-0 mt-0.5">
          <BatteryIndicator status={batteryStatus} percentage={batteryPercentage} />
        </div>
      </div>

      {/* ── Last seen ticker ─────────────────────────────────────── */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Last seen:{" "}
          <span
            className={[
              "font-medium tabular-nums",
              liveStatus === "live"
                ? "text-green-700"
                : liveStatus === "stale"
                  ? "text-amber-600"
                  : "text-red-600",
            ].join(" ")}
          >
            {lastContactTs > 0
              ? formatSecondsSince(nowMs, lastContactTs)
              : "never"}
          </span>
        </span>
        <SensorHealthPill
          health={sensorHealth}
          nodeId={node.nodeId}
          nowMs={nowMs}
        />
      </div>

      {/* ── Key readings ─────────────────────────────────────────── */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        <ReadingRow
          label="Temp"
          value={typeof tempC === "number" ? `${tempC.toFixed(1)} °C` : "—"}
        />
        <ReadingRow
          label="Humidity"
          value={typeof humPct === "number" ? `${humPct.toFixed(1)}%` : "—"}
        />
        <ReadingRow
          label="PM 2.5"
          value={typeof pm25 === "number" ? `${pm25.toFixed(2)} µg/m³` : "—"}
          stale={isSensorLabelStale(staleByNode, node.nodeId, "SPS30")}
          staleLabel="SPS30 (stale)"
        />
        <ReadingRow
          label="CO₂"
          value={typeof co2 === "number" ? `${Math.round(co2)} ppm` : "—"}
          stale={isSensorLabelStale(staleByNode, node.nodeId, "SCD41")}
          staleLabel="SCD41 (stale)"
        />
      </div>

      {/* ── Conditional degradation badges ───────────────────────── */}
      {(!throttleInfo.isHealthy ||
        (typeof pendingBatches === "number" && pendingBatches > 0) ||
        connectivity.tailscaleDown ||
        connectivity.wifiPoor) && (
        <div className="px-4 pb-3">
          <ConditionalBadges
            throttledState={typeof throttledState === "string" ? throttledState : null}
            pendingBatches={typeof pendingBatches === "number" ? pendingBatches : null}
            tailscaleDown={connectivity.tailscaleDown}
            wifiPoor={connectivity.wifiPoor}
            wifiSignalDbm={typeof wifiSignalDbm === "number" ? wifiSignalDbm : null}
          />
        </div>
      )}

      {/* ── System health accordion ───────────────────────────────── */}
      <div className="border-t border-slate-100">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded((v) => !v); }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
          aria-expanded={expanded}
          aria-controls={`system-health-${node.nodeId}`}
        >
          <span className="font-medium">System health</span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>

        {expanded && (
          <div
            id={`system-health-${node.nodeId}`}
            className="px-4 pb-4 grid grid-cols-2 gap-x-4 gap-y-2"
          >
            <SystemRow
              icon={<Thermometer className="h-3.5 w-3.5 text-slate-400" />}
              label="CPU temp"
              value={
                typeof cpuTemp === "number" ? `${cpuTemp.toFixed(1)} °C` : "—"
              }
              warn={typeof cpuTemp === "number" && cpuTemp > 80}
            />
            <SystemRow
              icon={<Cpu className="h-3.5 w-3.5 text-slate-400" />}
              label="CPU usage"
              value={
                typeof cpuUsage === "number" ? `${cpuUsage.toFixed(1)}%` : "—"
              }
              warn={typeof cpuUsage === "number" && cpuUsage > 80}
            />
            <SystemRow
              icon={<MemoryStick className="h-3.5 w-3.5 text-slate-400" />}
              label="Memory"
              value={
                typeof memPct === "number" ? `${memPct.toFixed(1)}%` : "—"
              }
              warn={typeof memPct === "number" && memPct > 85}
            />
            <SystemRow
              icon={<HardDrive className="h-3.5 w-3.5 text-slate-400" />}
              label="Disk"
              value={
                typeof diskPct === "number" ? `${diskPct.toFixed(1)}%` : "—"
              }
              warn={typeof diskPct === "number" && diskPct > 90}
            />
            {!throttleInfo.isHealthy && (
              <div className="col-span-2 flex items-start gap-1.5 pt-1 border-t border-slate-100">
                <span className="mt-0.5 shrink-0">
                  <Zap
                    className={`h-3.5 w-3.5 ${
                      throttleInfo.severity === "critical"
                        ? "text-red-500"
                        : "text-amber-500"
                    }`}
                    aria-hidden
                  />
                </span>
                <div>
                  <span className="text-xs text-slate-400 block leading-none">
                    Power / thermal ({throttleInfo.raw})
                  </span>
                  <span
                    className={`text-xs font-medium leading-snug ${
                      throttleInfo.severity === "critical"
                        ? "text-red-700"
                        : "text-amber-700"
                    }`}
                  >
                    {throttleInfo.summary}
                  </span>
                </div>
              </div>
            )}
            {uptimeSeconds !== null && (
              <div className="col-span-2 pt-1 text-xs text-slate-400 border-t border-slate-100 mt-1">
                Uptime: <span className="text-slate-600 font-medium">{formatUptime(uptimeSeconds)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
    </Link>
  );
}

// ─── Mini sub-components ──────────────────────────────────────────────────────

function ReadingRow({
  label,
  value,
  stale = false,
  staleLabel,
}: {
  label: string;
  value: string;
  stale?: boolean;
  staleLabel?: string;
}) {
  return (
    <div>
      <span className="text-xs text-slate-400 block leading-none">
        {stale ? (staleLabel ?? `${label} (stale)`) : label}
      </span>
      <span
        className={[
          "text-sm font-medium tabular-nums",
          stale ? "text-amber-700" : "text-slate-800",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function SystemRow({
  icon,
  label,
  value,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warn: boolean;
}) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <span className="text-xs text-slate-400 block leading-none">{label}</span>
        <span
          className={[
            "text-sm font-medium tabular-nums",
            warn ? "text-amber-600" : "text-slate-700",
          ].join(" ")}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
