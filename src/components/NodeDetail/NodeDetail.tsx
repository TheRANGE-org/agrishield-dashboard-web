import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Battery, ArrowUp, ChevronDown, ChevronUp } from "lucide-react";
import { useFleet } from "../../hooks/useFleet";
import { useMetadata } from "../../hooks/useMetadata";
import { useNodeHistory } from "../../hooks/useNodeHistory";
import { useTicker } from "../../hooks/useTicker";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import ChartLoadingOverlay from "../shared/ChartLoadingOverlay";
import QueryLoadError from "../shared/QueryLoadError";
import ChartTimeControls from "./ChartTimeControls";
import MetricChart, { ChartSkeleton, ChartEmpty } from "./MetricChart";
import PairedChart from "./PairedChart";
import NodeHealthPanel from "./NodeHealthPanel";
import OverlayStatusBadge from "../FleetView/OverlayStatusBadge";
import type { ChartTimeSelection } from "../../lib/timeWindow";
import { useFleetStaleMetrics } from "../../hooks/useFleetStaleMetrics";
import { useRefreshNodeData } from "../../hooks/useRefreshNodeData";
import { chartAxisWindow, selectionIsDeepHistory } from "../../lib/timeWindow";
import { transformQueryResponse, hasData } from "../../lib/chartData";
import type { FleetNode, Catalog, MetricMetadata } from "../../api/types";
import {
  computeStatus,
  parseBatteryStatus,
  batteryStatusColor,
} from "../../lib/status";
import { formatSecondsSince, formatMetricValue } from "../../lib/format";
import { degreesToCompassPoint } from "../../lib/timeWindow";

// ─── Headline metric definitions ──────────────────────────────────────────────

/**
 * The 5 headline metrics shown above-fold. Each entry specifies the primary
 * metric name and its optional pair. Source is always "readings" for these.
 */
const HEADLINE_METRICS: { primary: string; paired?: string }[] = [
  { primary: "bme688_temperature_c" },
  { primary: "bme688_humidity_pct", paired: "avg_absolute_humidity_g_m3" },
  { primary: "bme688_gas_ohms", paired: "bme688_gas_ohms_ah_normalized" },
  { primary: "sps30_pm2_5", paired: "sps30_pm2_5_max" },
  { primary: "scd41_co2_ppm", paired: "scd41_co2_ppm_max" },
  {
    primary: "weather_kit_anemometer_wind_gust_ms_max",
    paired: "weather_kit_anemometer_wind_gust_ms",
  },
];

/** Envelope diagnostics shown on the node health panel instead of "Show all". */
const HEALTH_PANEL_READING_CHARTS = ["sample_count", "byte_count"] as const;

/** Battery pair on the health panel (telemetry, ~15 min cadence). */
export const HEALTH_PANEL_POWER_PAIR = {
  primary: "sensor_health_battery_percentage",
  paired: "sensor_health_battery_voltage_v",
} as const;

/** Connectivity telemetry charts on the health panel. */
const HEALTH_PANEL_CONNECTIVITY_CHARTS = [
  "system_health_network_latency_ms",
  "system_health_uplink_gateway_ok",
  "system_health_uplink_internet_ok",
  "system_health_wifi_signal_level_dbm",
  "system_health_tailscale_online",
] as const;

/** Telemetry metrics charted on the node health panel (upload queue, etc.). */
const HEALTH_PANEL_TELEMETRY_CHARTS = [
  ...HEALTH_PANEL_CONNECTIVITY_CHARTS,
  "system_health_queue_pending_batches",
] as const;

/** All telemetry metrics fetched for the health panel (charts + power pair). */
function healthPanelTelemetryMetricNames(): string[] {
  return [
    ...new Set([
      ...HEALTH_PANEL_TELEMETRY_CHARTS,
      HEALTH_PANEL_POWER_PAIR.primary,
      HEALTH_PANEL_POWER_PAIR.paired,
    ]),
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Collects all reading metric names needed for the "show all" expanded view
 * excluding the headline metrics (already fetched separately) and
 * wind_vane_degrees variants (not charted per Q5 decision).
 */
function getAllReadingMetricNames(catalog: Catalog): string[] {
  const headlineSet = new Set(
    HEADLINE_METRICS.flatMap((h) => (h.paired ? [h.primary, h.paired] : [h.primary]))
  );
  const healthPanelSet = new Set<string>(HEALTH_PANEL_READING_CHARTS);
  const windVaneNames = new Set([
    "wind_vane_degrees",
    "wind_vane_degrees_avg",
    "wind_vane_voltage",
  ]);

  return Object.values(catalog.metrics)
    .filter(
      (m) =>
        m.source === "readings" &&
        m.type === "numeric" &&
        !headlineSet.has(m.name) &&
        !healthPanelSet.has(m.name) &&
        !windVaneNames.has(m.name)
    )
    .map((m) => m.name);
}

// ─── Latest-state strip ───────────────────────────────────────────────────────

interface LatestStripProps {
  node: FleetNode;
  nowMs: number;
  catalog: Catalog;
}

function LatestStrip({ node, nowMs, catalog }: LatestStripProps) {
  const secondsSince = node.latest_reading
    ? Math.floor(nowMs / 1000 - node.latest_reading.ts)
    : node.seconds_since_contact;
  const status = computeStatus(secondsSince);

  const tv = node.latest_telemetry?.values ?? {};
  const rv = node.latest_reading?.values ?? {};

  const batteryPct = typeof tv["sensor_health_battery_percentage"] === "number"
    ? tv["sensor_health_battery_percentage"]
    : null;
  const batteryStatusStr = typeof tv["sensor_health_battery_status"] === "string"
    ? tv["sensor_health_battery_status"]
    : null;
  const batteryStatus = parseBatteryStatus(batteryStatusStr);

  // Wind direction (Q5 — shown as arrow, not charted)
  const windDegrees = rv["wind_vane_degrees_avg"];
  const windDeg = typeof windDegrees === "number" ? windDegrees : null;
  const compassPoint = windDeg !== null ? degreesToCompassPoint(windDeg) : null;

  // Wind avg speed for context
  const windAvgMs = rv["weather_kit_anemometer_wind_avg_ms"];

  // Status color
  const statusColor =
    status === "live"
      ? "text-green-700"
      : status === "stale"
      ? "text-amber-600"
      : "text-red-600";

  const statusLabel =
    status === "live" ? "Live" : status === "stale" ? "Stale" : "Offline";

  // Temp + humidity for the strip
  const tempM = catalog.metrics["bme688_temperature_c"];
  const humM = catalog.metrics["bme688_humidity_pct"];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {/* Status */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span
            className={[
              "inline-block h-2 w-2 rounded-full",
              status === "live"
                ? "bg-green-500"
                : status === "stale"
                ? "bg-amber-400"
                : "bg-red-500",
            ].join(" ")}
          />
          <span className={`font-medium ${statusColor}`}>Data · {statusLabel}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500 tabular-nums">
            {node.latest_reading
              ? formatSecondsSince(nowMs, node.latest_reading.ts)
              : "no contact"}
          </span>
        </div>
        <OverlayStatusBadge overlay={node.overlay} nowMs={nowMs} />
      </div>

      {/* Battery */}
      <div className="flex items-center gap-1.5">
        <Battery className={`h-4 w-4 ${batteryStatusColor(batteryStatus)}`} aria-hidden />
        <span className={`font-medium tabular-nums ${batteryStatusColor(batteryStatus)}`}>
          {batteryPct !== null ? `${Math.round(batteryPct)}%` : "—"}
        </span>
        {batteryStatusStr && (
          <span className="text-slate-400 text-xs">({batteryStatusStr})</span>
        )}
      </div>

      {/* Temp */}
      {tempM && (
        <div className="flex items-center gap-1 text-slate-700">
          <span className="text-slate-400 text-xs">Temp</span>
          <span className="font-medium tabular-nums">
            {formatMetricValue(rv["bme688_temperature_c"], tempM)}
          </span>
        </div>
      )}

      {/* Humidity */}
      {humM && (
        <div className="flex items-center gap-1 text-slate-700">
          <span className="text-slate-400 text-xs">Humidity</span>
          <span className="font-medium tabular-nums">
            {formatMetricValue(rv["bme688_humidity_pct"], humM)}
          </span>
        </div>
      )}

      {/* Wind direction (Q5 — arrow + compass point, no chart) */}
      {windDeg !== null && compassPoint && (
        <div className="flex items-center gap-1 text-slate-700">
          <ArrowUp
            className="h-4 w-4 text-slate-500 shrink-0"
            style={{ transform: `rotate(${(windDeg + 180) % 360}deg)` }}
            aria-label={`Wind from ${compassPoint}`}
          />
          <span className="font-medium">{compassPoint}</span>
          {typeof windAvgMs === "number" && (
            <span className="text-slate-400 text-xs">{windAvgMs.toFixed(1)} m/s</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Chart grid section ───────────────────────────────────────────────────────

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 pt-3 pb-1">
        <h3 className="text-sm font-medium text-slate-700">{title}</h3>
      </div>
      <div className="px-2 pb-3">{children}</div>
    </div>
  );
}

// ─── NodeDetail ───────────────────────────────────────────────────────────────

export default function NodeDetail() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const [chartSelection, setChartSelection] = useState<ChartTimeSelection>({
    kind: "preset",
    window: "24h",
  });
  const [showAll, setShowAll] = useState(false);
  const [healthExpanded, setHealthExpanded] = useState(false);

  useEffect(() => {
    setShowAll(false);
    setHealthExpanded(false);
  }, [nodeId]);

  const axisWindow = chartAxisWindow(chartSelection);
  const deepHistory = selectionIsDeepHistory(chartSelection);
  const onHealthExpandedChange = useCallback((expanded: boolean) => {
    setHealthExpanded(expanded);
  }, []);

  const { fleet, isLoading: fleetLoading, error: fleetError } = useFleet();
  const { catalog, isLoading: catalogLoading } = useMetadata();
  const nowMs = useTicker(1000);
  const { staleByNode } = useFleetStaleMetrics(nodeId ? [nodeId] : []);
  const { refresh, isRefreshing } = useRefreshNodeData(nodeId ?? "");

  // ── Headline metrics query ────────────────────────────────────────────────

  const headlineMetricNames = useMemo(
    () =>
      HEADLINE_METRICS.flatMap((h) => (h.paired ? [h.primary, h.paired] : [h.primary])),
    []
  );

  const {
    data: headlineHistoryData,
    error: headlineError,
    isLoading: headlineLoading,
    isValidating: headlineValidating,
    retry: retryHeadlines,
  } = useNodeHistory(
    nodeId ?? "",
    "readings",
    headlineMetricNames,
    chartSelection
  );

  const headlinesOk = !!headlineHistoryData;
  // Deep history: gate follow-on GCS pulls until headlines succeed (avoid stampedes on 503).
  const followOnEnabled = !deepHistory || headlinesOk;

  // ── "Show all" additional metrics query ──────────────────────────────────

  const allReadingNames = useMemo(
    () => (catalog ? getAllReadingMetricNames(catalog) : []),
    [catalog]
  );

  const {
    data: allHistoryData,
    error: allError,
    isLoading: allLoading,
    isValidating: allValidating,
    retry: retryAll,
  } = useNodeHistory(
    nodeId ?? "",
    "readings",
    allReadingNames,
    chartSelection,
    { enabled: showAll && followOnEnabled }
  );

  const {
    data: healthPanelHistoryData,
    error: healthReadingsError,
    isLoading: healthPanelLoading,
    isValidating: healthPanelValidating,
    retry: retryHealthReadings,
  } = useNodeHistory(
    nodeId ?? "",
    "readings",
    [...HEALTH_PANEL_READING_CHARTS],
    chartSelection,
    { enabled: healthExpanded && followOnEnabled }
  );

  const {
    data: healthPanelTelemetryData,
    error: healthTelemetryError,
    isLoading: healthPanelTelemetryLoading,
    isValidating: healthPanelTelemetryValidating,
    retry: retryHealthTelemetry,
  } = useNodeHistory(
    nodeId ?? "",
    "telemetry",
    healthPanelTelemetryMetricNames(),
    chartSelection,
    {
      // On deep history, wait for readings health query to settle before telemetry.
      enabled:
        healthExpanded &&
        followOnEnabled &&
        (!deepHistory || (!healthPanelLoading && !healthPanelValidating && !!healthPanelHistoryData)),
    }
  );

  const headlineChartsBusy = headlineLoading || headlineValidating;
  const allChartsBusy = allLoading || allValidating;
  const healthPanelChartsBusy =
    healthPanelLoading ||
    healthPanelValidating ||
    healthPanelTelemetryLoading ||
    healthPanelTelemetryValidating;

  const healthPanelSeries = useMemo(() => {
    if (!healthPanelHistoryData && !healthPanelTelemetryData) return null;
    const readings = healthPanelHistoryData
      ? transformQueryResponse(healthPanelHistoryData.response)
      : {};
    const telemetry = healthPanelTelemetryData
      ? transformQueryResponse(healthPanelTelemetryData.response)
      : {};
    return { ...readings, ...telemetry };
  }, [healthPanelHistoryData, healthPanelTelemetryData]);

  const healthQueryError = healthReadingsError ?? healthTelemetryError;

  async function retryHeadlinesSection() {
    await retryHeadlines();
  }

  async function retryHealthSection() {
    await Promise.all([retryHealthReadings(), retryHealthTelemetry()]);
  }

  async function retryAllSection() {
    await retryAll();
  }

  // ─── Guards ────────────────────────────────────────────────────────────────

  if (!nodeId) return <Navigate to="/" replace />;

  if (fleetLoading || catalogLoading) {
    return <LoadingState message="Loading node data…" />;
  }

  if (fleetError) {
    return <ErrorState message="Unable to load fleet data" detail={fleetError.message} />;
  }

  const node = fleet?.nodes.find((n) => n.nodeId === nodeId);
  if (!node) {
    return (
      <ErrorState
        message={`Node "${nodeId}" not found`}
        detail="It may have been removed or the ID is incorrect."
      />
    );
  }

  if (!catalog) {
    return <LoadingState message="Loading metric catalog…" />;
  }

  // Non-null capture for TypeScript — all guards passed above
  const cat: Catalog = catalog;

  // ── Transform headline series ─────────────────────────────────────────────

  const headlineSeries = headlineHistoryData
    ? transformQueryResponse(headlineHistoryData.response)
    : null;

  // ── Transform "show all" series ───────────────────────────────────────────

  const allSeries = allHistoryData
    ? transformQueryResponse(allHistoryData.response)
    : null;

  // ── Chart rendering helpers ───────────────────────────────────────────────

  function renderHeadlineChart(
    h: { primary: string; paired?: string },
    idx: number
  ) {
    const primaryMeta: MetricMetadata | undefined = cat.metrics[h.primary];
    if (!primaryMeta) return null;

    const showSkeleton = headlineChartsBusy && !headlineSeries;

    if (h.paired) {
      const pairedMeta = cat.metrics[h.paired];
      if (!pairedMeta) return null;

      const avgData = headlineSeries?.[h.primary] ?? [];
      const peakData = headlineSeries?.[h.paired] ?? [];
      const hasAnyData = hasData(avgData) || hasData(peakData);

      return (
        <ChartCard key={idx} title={primaryMeta.label}>
          {showSkeleton ? (
            <ChartSkeleton />
          ) : !hasAnyData ? (
            <ChartEmpty
              label={primaryMeta.label}
              detail="Try a shorter time window if the sensor recently went offline."
            />
          ) : (
            <PairedChart
              avgMetric={primaryMeta}
              peakMetric={pairedMeta}
              avgData={avgData}
              peakData={peakData}
              window={axisWindow}
            />
          )}
        </ChartCard>
      );
    }

    const data = headlineSeries?.[h.primary] ?? [];
    return (
      <ChartCard key={idx} title={primaryMeta.label}>
        {showSkeleton ? (
          <ChartSkeleton />
        ) : !hasData(data) ? (
          <ChartEmpty
            label={primaryMeta.label}
            detail="Try a shorter time window if the sensor recently went offline."
          />
        ) : (
          <MetricChart metric={primaryMeta} data={data} window={axisWindow} />
        )}
      </ChartCard>
    );
  }

  function renderAllChart(name: string, idx: number) {
    const meta = cat.metrics[name];
    if (!meta) return null;
    // Skip "secondary" pair members — we'll render them as part of their primary
    if (meta.pairs_with && cat.metrics[meta.pairs_with]) {
      const pairMeta = cat.metrics[meta.pairs_with];
      if (
        allReadingNames.includes(meta.pairs_with) &&
        pairMeta.pairs_with === name &&
        allReadingNames.indexOf(name) > allReadingNames.indexOf(meta.pairs_with)
      ) {
        return null;
      }
    }

    const data = allSeries?.[name] ?? [];
    const pairName = meta.pairs_with;
    const pairMeta = pairName ? cat.metrics[pairName] : null;
    const pairInSet = pairName && allReadingNames.includes(pairName);

    const showAllSkeleton = allChartsBusy && !allSeries;

    if (pairMeta && pairInSet) {
      const pairData = allSeries?.[pairName!] ?? [];
      const hasAnyData = hasData(data) || hasData(pairData);

      return (
        <ChartCard key={idx} title={meta.label}>
          {showAllSkeleton ? (
            <ChartSkeleton />
          ) : !hasAnyData ? (
            <ChartEmpty
              label={meta.label}
              detail="Try a shorter time window if the sensor recently went offline."
            />
          ) : (
            <PairedChart
              avgMetric={meta}
              peakMetric={pairMeta}
              avgData={data}
              peakData={pairData}
              window={axisWindow}
            />
          )}
        </ChartCard>
      );
    }

    return (
      <ChartCard key={idx} title={meta.label}>
        {showAllSkeleton ? (
          <ChartSkeleton />
        ) : !hasData(data) ? (
          <ChartEmpty
            label={meta.label}
            detail="Try a shorter time window if the sensor recently went offline."
          />
        ) : (
          <MetricChart metric={meta} data={data} window={axisWindow} />
        )}
      </ChartCard>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header strip ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Fleet view
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">{nodeId}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Site: {node.siteId}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <ChartTimeControls value={chartSelection} onChange={setChartSelection} />
        </div>
      </div>

      {/* ── Latest-state strip ────────────────────────────────────────────── */}
      <LatestStrip node={node} nowMs={nowMs} catalog={catalog} />

      {/* ── Node health & telemetry (collapsed by default) ─────────────────── */}
      {healthExpanded && healthQueryError && (
        <QueryLoadError
          error={healthQueryError}
          onRetry={() => void retryHealthSection()}
          isRetrying={healthPanelChartsBusy}
        />
      )}
      <NodeHealthPanel
        node={node}
        catalog={cat}
        nowMs={nowMs}
        staleSensors={staleByNode.get(node.nodeId)}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
        healthPanelSeries={healthPanelSeries}
        healthPanelPowerPair={HEALTH_PANEL_POWER_PAIR}
        healthPanelConnectivityChartMetrics={[...HEALTH_PANEL_CONNECTIVITY_CHARTS]}
        healthPanelTelemetryChartMetrics={["system_health_queue_pending_batches"]}
        healthPanelReadingChartMetrics={[...HEALTH_PANEL_READING_CHARTS]}
        chartWindow={axisWindow}
        healthChartsBusy={healthPanelChartsBusy}
        onExpandedChange={onHealthExpandedChange}
      />

      {/* ── Headline charts ───────────────────────────────────────────────── */}
      <section aria-label="Headline metrics" className="relative">
        <ChartLoadingOverlay active={headlineChartsBusy} />
        <h2 className="text-sm font-medium text-slate-600 mb-3 uppercase tracking-wide text-xs">
          Key metrics
        </h2>
        {headlineError && (
          <QueryLoadError
            error={headlineError}
            onRetry={() => void retryHeadlinesSection()}
            isRetrying={headlineChartsBusy}
          />
        )}
        {deepHistory && headlineChartsBusy && !headlineSeries && (
          <p className="text-xs text-slate-500 mb-3">
            Loading key metrics from cold storage… additional charts wait until this finishes.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
          {HEADLINE_METRICS.map((h, i) => renderHeadlineChart(h, i))}
        </div>
      </section>

      {/* ── Show all disclosure ───────────────────────────────────────────── */}
      <section aria-label="All primary metrics">
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800 transition-colors"
          aria-expanded={showAll}
          id="show-all-metrics-toggle"
        >
          {showAll ? (
            <ChevronUp className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden />
          )}
          {showAll ? "Hide additional metrics" : "Show all primary metrics"}
        </button>

        {showAll && (
          <div className="relative mt-4">
            <ChartLoadingOverlay active={allChartsBusy} />
            {allError && (
              <QueryLoadError
                error={allError}
                onRetry={() => void retryAllSection()}
                isRetrying={allChartsBusy}
              />
            )}
            {deepHistory && !followOnEnabled && (
              <p className="text-xs text-slate-500 mb-3">
                Waiting for key metrics to load before fetching additional charts…
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
            {allReadingNames.map((name, i) => renderAllChart(name, i))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
