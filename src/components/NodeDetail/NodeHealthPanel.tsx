import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ExternalLink, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import type { FleetNode, Catalog } from "../../api/types";
import {
  computeSensorHealth,
  type SensorHealthDetail,
  type SensorHealthSeverity,
  overlayReachability,
} from "../../lib/status";
import {
  formatContactSummary,
  getNodeContactInfo,
  nodeSetupUrl,
} from "../../lib/nodeContact";
import { formatAgeSecondsAgo, formatSecondsSince } from "../../lib/format";
import type { MetricSeriesMap } from "../../lib/chartData";
import { hasData } from "../../lib/chartData";
import type { AxisWindow } from "../../lib/timeWindow";
import MetricChart, { ChartSkeleton, ChartEmpty } from "./MetricChart";
import PairedChart from "./PairedChart";
import OverlayStatusBadge from "../FleetView/OverlayStatusBadge";
import TelemetryPanel from "./TelemetryPanel";

interface NodeHealthPanelProps {
  node: FleetNode;
  catalog: Catalog;
  nowMs: number;
  staleSensors?: Set<string>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  healthPanelSeries?: MetricSeriesMap | null;
  healthPanelPowerPair?: { primary: string; paired: string };
  healthPanelConnectivityChartMetrics?: string[];
  healthPanelReadingChartMetrics?: string[];
  healthPanelTelemetryChartMetrics?: string[];
  chartWindow?: AxisWindow;
  healthChartsBusy?: boolean;
  /** Notifies parent when the panel opens/closes (for deferred chart fetches). */
  onExpandedChange?: (expanded: boolean) => void;
}

const SEVERITY_BADGE: Record<SensorHealthSeverity, string> = {
  healthy: "bg-green-50 text-green-800 border-green-200",
  degraded: "bg-amber-50 text-amber-800 border-amber-200",
  unhealthy: "bg-red-50 text-red-800 border-red-200",
};

function SensorStatusRow({ detail }: { detail: SensorHealthDetail }) {
  const showAutoReinit = detail.autoReinitCount != null;

  return (
    <div
      className={[
        "rounded-lg border px-3 py-2 text-xs",
        SEVERITY_BADGE[detail.severity],
      ].join(" ")}
    >
      <div className="font-semibold">{detail.label}</div>
      <div className="mt-0.5 opacity-90">{detail.detail}</div>
      {(detail.lastOkAgeSec != null || showAutoReinit) && (
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] tabular-nums opacity-90">
          {detail.lastOkAgeSec != null && (
            <>
              <dt className="text-inherit/70">Last OK read</dt>
              <dd>{formatAgeSecondsAgo(detail.lastOkAgeSec)}</dd>
            </>
          )}
          {showAutoReinit && (
            <>
              <dt className="text-inherit/70">Auto re-inits</dt>
              <dd>{detail.autoReinitCount!.toLocaleString()}</dd>
            </>
          )}
        </dl>
      )}
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
  healthPanelSeries = null,
  healthPanelPowerPair,
  healthPanelConnectivityChartMetrics = [],
  healthPanelReadingChartMetrics = [],
  healthPanelTelemetryChartMetrics = [],
  chartWindow = "24h",
  healthChartsBusy = false,
  onExpandedChange,
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
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  // Collapse when opening or switching nodes; expand once for fleet deep-links.
  useEffect(() => {
    if (window.location.hash === "#sensor-health") {
      setExpanded(true);
      navigate(
        { pathname: location.pathname, search: location.search },
        { replace: true }
      );
    } else {
      setExpanded(false);
    }
  }, [node.nodeId, navigate, location.pathname, location.search]);

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash !== "#sensor-health") return;
      setExpanded(true);
      navigate(
        { pathname: location.pathname, search: location.search },
        { replace: true }
      );
    };
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [navigate, location.pathname, location.search]);

  const diskPct = telemetryValues["system_health_disk_usage_percent"];
  const batteryPct = telemetryValues["sensor_health_battery_percentage"];
  const pendingBatches = telemetryValues["system_health_queue_pending_batches"];
  const wifiSsid = telemetryValues["system_health_wifi_ssid"];
  const wifiIpv4 = telemetryValues["system_health_wifi_ipv4"];
  const queueRanges =
    catalog.metrics["system_health_queue_pending_batches"]?.reference_ranges;
  const queueCritical =
    typeof queueRanges?.critical_high === "number" &&
    typeof pendingBatches === "number" &&
    pendingBatches >= queueRanges.critical_high;
  const queueWarning =
    !queueCritical &&
    typeof queueRanges?.warning_high === "number" &&
    typeof pendingBatches === "number" &&
    pendingBatches >= queueRanges.warning_high;

  const collapsedSummaryParts: string[] = [];
  if (sensorHealth.total > 0) {
    collapsedSummaryParts.push(
      `${sensorHealth.healthy}/${sensorHealth.total} sensors healthy`
    );
  }
  if (node.latest_telemetry?.ts) {
    collapsedSummaryParts.push(
      `telemetry ${formatSecondsSince(nowMs, node.latest_telemetry.ts)}`
    );
  }
  if (typeof diskPct === "number") {
    collapsedSummaryParts.push(`disk ${diskPct.toFixed(0)}%`);
  }
  if (typeof batteryPct === "number") {
    collapsedSummaryParts.push(`battery ${batteryPct.toFixed(0)}%`);
  }
  const meshReach = overlayReachability(node.overlay);
  if (meshReach !== "unknown") {
    collapsedSummaryParts.push(`mesh ${meshReach}`);
  }
  if (typeof pendingBatches === "number" && pendingBatches > 0) {
    collapsedSummaryParts.push(`${pendingBatches} batches queued`);
  }
  const collapsedSummary = collapsedSummaryParts.join(" · ");

  function seriesForMetric(metricName: string) {
    const data = healthPanelSeries?.[metricName] ?? [];
    if (metricName === "system_health_network_latency_ms") {
      return data.map((point) =>
        point.value != null && point.value < 0 ? { ...point, value: null } : point
      );
    }
    return data;
  }

  function renderPowerChart() {
    if (!healthPanelPowerPair) return null;

    const primaryMeta = catalog.metrics[healthPanelPowerPair.primary];
    const pairedMeta = catalog.metrics[healthPanelPowerPair.paired];
    if (!primaryMeta || !pairedMeta) return null;

    const avgData = healthPanelSeries?.[healthPanelPowerPair.primary] ?? [];
    const peakData = healthPanelSeries?.[healthPanelPowerPair.paired] ?? [];
    const showSkeleton = healthChartsBusy && !healthPanelSeries;
    const hasAnyData = hasData(avgData) || hasData(peakData);

    return (
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-slate-600 mb-2">Power</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden md:col-span-2">
            <div className="px-3 pt-2 pb-1">
              <h4 className="text-xs font-medium text-slate-700">
                {primaryMeta.label} &amp; {pairedMeta.label}
              </h4>
            </div>
            <div className="px-1 pb-2">
              {showSkeleton ? (
                <ChartSkeleton />
              ) : !hasAnyData ? (
                <ChartEmpty
                  label={primaryMeta.label}
                  detail="No telemetry in the selected time window."
                />
              ) : (
                <PairedChart
                  avgMetric={primaryMeta}
                  peakMetric={pairedMeta}
                  avgData={avgData}
                  peakData={peakData}
                  window={chartWindow}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderMetricCharts(
    title: string,
    metrics: string[],
    emptyDetail: string
  ) {
    if (metrics.length === 0) return null;

    return (
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-slate-600 mb-2">{title}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
          {metrics.map((metricName) => {
            const meta = catalog.metrics[metricName];
            if (!meta) return null;
            const data = seriesForMetric(metricName);
            const showSkeleton = healthChartsBusy && !healthPanelSeries;

            return (
              <div
                key={metricName}
                className="rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden"
              >
                <div className="px-3 pt-2 pb-1">
                  <h4 className="text-xs font-medium text-slate-700">
                    {meta.label}
                  </h4>
                </div>
                <div className="px-1 pb-2">
                  {showSkeleton ? (
                    <ChartSkeleton />
                  ) : !hasData(data) ? (
                    <ChartEmpty label={meta.label} detail={emptyDetail} />
                  ) : (
                    <MetricChart
                      metric={meta}
                      data={data}
                      window={chartWindow}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section
      id="sensor-health"
      aria-label="Node health and telemetry"
      className="bg-slate-100 rounded-xl border border-slate-300 shadow-sm scroll-mt-20 ring-1 ring-slate-200/80"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-4 py-3 border-b border-slate-200/80 bg-slate-200/40 rounded-t-xl">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-start gap-2 text-left min-w-0 flex-1 hover:opacity-90 transition-opacity"
          aria-expanded={expanded}
          aria-controls="node-health-panel-body"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" aria-hidden />
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-700">
              Node health &amp; telemetry
            </h2>
            {expanded ? (
              <p className="text-xs text-slate-500 mt-0.5">
                Contact, restart, and per-sensor status from the latest telemetry
                snapshot.
              </p>
            ) : (
              collapsedSummary && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {collapsedSummary}
                </p>
              )
            )}
          </div>
        </button>
        <div className="flex flex-wrap gap-2 shrink-0 sm:pl-2">
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

      {expanded && (
        <div id="node-health-panel-body" className="px-4 py-4">
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
              {formatSecondsSince(nowMs, node.latest_telemetry.ts)}
            </dd>
            <dd className="text-slate-500">
              Health metrics update every ~15 min on the node
            </dd>
          </div>
        )}
        {(typeof wifiSsid === "string" || typeof wifiIpv4 === "string") && (
          <div>
            <dt className="text-slate-400">WiFi (local LAN)</dt>
            <dd className="font-medium text-slate-800 mt-0.5">
              {typeof wifiSsid === "string" && wifiSsid.length > 0
                ? wifiSsid
                : "—"}
            </dd>
            {typeof wifiIpv4 === "string" && wifiIpv4.length > 0 && (
              <dd className="text-slate-500 mt-0.5 tabular-nums">{wifiIpv4}</dd>
            )}
          </div>
        )}
        {node.overlay && (
          <div>
            <dt className="text-slate-400">Tailscale mesh (Headscale)</dt>
            <dd className="mt-0.5">
              <OverlayStatusBadge overlay={node.overlay} nowMs={nowMs} />
            </dd>
            <dd className="text-slate-500 mt-1 tabular-nums">
              {node.overlay.tailscale_ip && (
                <span className="block">{node.overlay.tailscale_ip}</span>
              )}
              {node.overlay.last_seen_ts != null && (
                <span className="block">
                  Last seen {formatSecondsSince(nowMs, node.overlay.last_seen_ts)}
                </span>
              )}
            </dd>
          </div>
        )}
        {typeof pendingBatches === "number" && (
          <div>
            <dt className="text-slate-400">Upload queue</dt>
            <dd
              className={[
                "font-medium mt-0.5 tabular-nums",
                queueCritical
                  ? "text-red-700"
                  : queueWarning
                  ? "text-amber-700"
                  : pendingBatches > 0
                  ? "text-amber-800"
                  : "text-slate-800",
              ].join(" ")}
            >
              {pendingBatches === 0
                ? "Clear — no batches waiting"
                : `${pendingBatches.toLocaleString()} batch${
                    pendingBatches === 1 ? "" : "es"
                  } pending upload`}
            </dd>
            <dd className="text-slate-500">
              {pendingBatches > 0
                ? "Node is buffering locally; chart below shows drain trend"
                : "Batches in data/queue/ awaiting edge upload"}
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
          {sensorHealth.telemetryAgeSeconds != null &&
            sensorHealth.telemetryAgeSeconds > 300 && (
              <p className="text-[11px] text-slate-400 mb-2">
                Sensor last-OK times are from the telemetry snapshot (
                {formatSecondsSince(nowMs, node.latest_telemetry!.ts)}).
              </p>
            )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sensorHealth.details.map((d) => (
              <SensorStatusRow key={d.label} detail={d} />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 mb-3">
        Use the field setup app (System tab) to check or restart sensors on the
        Pi. The refresh button above reloads data already ingested into the
        dashboard.
      </p>

      {renderPowerChart()}

      {renderMetricCharts(
        "Connectivity",
        healthPanelConnectivityChartMetrics,
        "No telemetry in the selected time window."
      )}

      {renderMetricCharts(
        "Upload queue",
        healthPanelTelemetryChartMetrics,
        "No telemetry in the selected time window."
      )}

      {renderMetricCharts(
        "Readings pipeline",
        healthPanelReadingChartMetrics,
        "No readings in the selected time window."
      )}

      <h3 className="text-xs font-semibold text-slate-600 mb-2">
        Full telemetry
      </h3>
      <TelemetryPanel
        catalog={catalog}
        values={telemetryValues}
        source="telemetry"
      />
        </div>
      )}
    </section>
  );
}
