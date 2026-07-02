import { ExternalLink, RefreshCw } from "lucide-react";
import type { FleetNode, Catalog } from "../../api/types";
import {
  computeSensorHealth,
  type SensorHealthDetail,
  type SensorHealthSeverity,
} from "../../lib/status";
import {
  formatContactSummary,
  getNodeContactInfo,
  nodeSetupUrl,
} from "../../lib/nodeContact";
import { formatSecondsSince } from "../../lib/format";
import TelemetryPanel from "./TelemetryPanel";

interface NodeHealthPanelProps {
  node: FleetNode;
  catalog: Catalog;
  nowMs: number;
  staleSensors?: Set<string>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const SEVERITY_BADGE: Record<SensorHealthSeverity, string> = {
  healthy: "bg-green-50 text-green-800 border-green-200",
  degraded: "bg-amber-50 text-amber-800 border-amber-200",
  unhealthy: "bg-red-50 text-red-800 border-red-200",
};

function SensorStatusRow({ detail }: { detail: SensorHealthDetail }) {
  return (
    <div
      className={[
        "rounded-lg border px-3 py-2 text-xs",
        SEVERITY_BADGE[detail.severity],
      ].join(" ")}
    >
      <div className="font-semibold">{detail.label}</div>
      <div className="mt-0.5 opacity-90">{detail.detail}</div>
    </div>
  );
}

export default function NodeHealthPanel({
  node,
  catalog,
  nowMs,
  staleSensors,
  onRefresh,
  isRefreshing = false,
}: NodeHealthPanelProps) {
  const nowSec = Math.floor(nowMs / 1000);
  const contact = getNodeContactInfo(node, nowSec);
  const contactFmt = formatContactSummary(contact, nowMs);
  const telemetryValues = node.latest_telemetry?.values ?? {};
  const readingValues = node.latest_reading?.values ?? {};

  const sensorHealth = computeSensorHealth(telemetryValues, {
    staleSensors,
    telemetryTs: node.latest_telemetry?.ts,
    nowSec,
    readingValues,
  });

  const setupUrl = nodeSetupUrl(node);

  return (
    <section
      id="sensor-health"
      aria-label="Node health and telemetry"
      className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 scroll-mt-20"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">
            Node health &amp; telemetry
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Contact, restart, and per-sensor status from the latest telemetry
            snapshot.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                className={["h-3.5 w-3.5", isRefreshing ? "animate-spin" : ""].join(
                  " "
                )}
                aria-hidden
              />
              Refresh dashboard data
            </button>
          )}
          <a
            href={setupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-100"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Field setup app
          </a>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-4 text-xs">
        <div>
          <dt className="text-slate-400">Last communication</dt>
          <dd className="font-medium text-slate-800 mt-0.5">
            {contactFmt.lastContactAt}
          </dd>
          <dd className="text-slate-500 tabular-nums">
            {contactFmt.lastContactAgo}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Last restart (estimated)</dt>
          <dd className="font-medium text-slate-800 mt-0.5">
            {contactFmt.lastRestartAt ?? "Unknown"}
          </dd>
          <dd className="text-slate-500 tabular-nums">
            {contactFmt.lastRestartAgo ?? "—"}
            {contactFmt.uptimeLabel && (
              <span className="text-slate-400">
                {" "}
                · uptime {contactFmt.uptimeLabel}
              </span>
            )}
          </dd>
        </div>
        {node.latest_telemetry?.ts && (
          <div>
            <dt className="text-slate-400">Telemetry snapshot</dt>
            <dd className="font-medium text-slate-800 mt-0.5 tabular-nums">
              {formatSecondsSince(nowMs, node.latest_telemetry.ts)} ago
            </dd>
            <dd className="text-slate-500">
              Health metrics update every ~15 min on the node
            </dd>
          </div>
        )}
      </dl>

      {sensorHealth.details.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-slate-600 mb-2">
            Monitored sensors ({sensorHealth.healthy}/{sensorHealth.total}{" "}
            healthy)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sensorHealth.details.map((d) => (
              <SensorStatusRow key={d.label} detail={d} />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 mb-3">
        To read sensors live on the Pi (UART / I2C test), use the field setup app
        while connected via Tailscale or local network. The refresh button above
        reloads data already ingested into the dashboard.
      </p>

      <h3 className="text-xs font-semibold text-slate-600 mb-2">
        Full telemetry
      </h3>
      <TelemetryPanel
        catalog={catalog}
        values={telemetryValues}
        source="telemetry"
      />
    </section>
  );
}
