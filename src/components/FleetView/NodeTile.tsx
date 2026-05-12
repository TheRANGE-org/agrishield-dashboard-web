import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Cpu, MemoryStick, HardDrive, Thermometer } from "lucide-react";
import type { FleetNode } from "../../api/types";
import type { Catalog } from "../../api/types";
import {
  computeStatus,
  parseBatteryStatus,
  computeSensorHealth,
  computeConnectivityWarning,
} from "../../lib/status";
import { formatSecondsSince, formatUptime } from "../../lib/format";
import StatusBadge from "./StatusBadge";
import BatteryIndicator from "./BatteryIndicator";
import SensorHealthPill from "./SensorHealthPill";
import ConditionalBadges from "./ConditionalBadges";

interface NodeTileProps {
  node: FleetNode;
  nowMs: number; // from useTicker
  catalog: Catalog;
}

const STATUS_BG: Record<string, string> = {
  live: "bg-white border-slate-200",
  stale: "bg-amber-50/60 border-amber-200",
  dead: "bg-red-50/60 border-red-200",
};

export default function NodeTile({ node, nowMs, catalog: _catalog }: NodeTileProps) {  // eslint-disable-line @typescript-eslint/no-unused-vars
  const [expanded, setExpanded] = useState(false);

  // Recompute status from live ticker so it transitions between polls
  const secondsSince = Math.floor(nowMs / 1000 - (node.latest_reading?.ts ?? 0));
  const liveStatus = computeStatus(
    node.latest_reading ? secondsSince : node.seconds_since_contact + Math.floor((nowMs / 1000) - (Date.now() / 1000))
  );

  // Use actual seconds from ticker against last reading ts
  const lastReadingTs = node.latest_reading?.ts ?? null;
  const telemetryValues = node.latest_telemetry?.values ?? {};
  const readingValues = node.latest_reading?.values ?? {};

  // Battery
  const batteryStatusRaw = telemetryValues["sensor_health_battery_status"];
  const batteryPct = telemetryValues["sensor_health_battery_percentage"];
  const batteryStatus = parseBatteryStatus(
    typeof batteryStatusRaw === "string" ? batteryStatusRaw : null
  );
  const batteryPercentage = typeof batteryPct === "number" ? batteryPct : null;

  // Sensor health
  const sensorHealth = computeSensorHealth(telemetryValues);

  // Connectivity warnings
  const connectivity = computeConnectivityWarning(telemetryValues);

  // Conditional badge values
  const throttledState = telemetryValues["system_health_rpi_throttled_state"];
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
            {lastReadingTs !== null
              ? formatSecondsSince(nowMs, lastReadingTs)
              : "never"}
          </span>
        </span>
        <SensorHealthPill
          healthy={sensorHealth.healthy}
          total={sensorHealth.total}
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
        />
        <ReadingRow
          label="CO₂"
          value={typeof co2 === "number" ? `${Math.round(co2)} ppm` : "—"}
        />
      </div>

      {/* ── Conditional degradation badges ───────────────────────── */}
      {(throttledState !== "0x0" ||
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

function ReadingRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-slate-400 block leading-none">{label}</span>
      <span className="text-sm font-medium text-slate-800 tabular-nums">{value}</span>
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
