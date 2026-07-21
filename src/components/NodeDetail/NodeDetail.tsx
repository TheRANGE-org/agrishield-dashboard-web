import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useParams, Navigate, useNavigate } from "react-router-dom";
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
import WeatherWindChart from "../WeatherView/WeatherWindChart";
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

// ─── Key metrics layout (3-column reading order) ──────────────────────────────
//
// Row1: BME temp | BME humidity | Wind speed & direction
// Row2: SCD41 temp | SCD41 humidity | Atmospheric pressure
// Row3: CO₂ | CO | VOC resistance
// Row4: PM2.5 | Typical particle size | VOC resistance ratio (AH-adj)

type HeadlineSlot =
  | { kind: "metric"; primary: string; paired?: string }
  | { kind: "wind_combo" };

const HEADLINE_SLOTS: HeadlineSlot[] = [
  { kind: "metric", primary: "bme688_temperature_c" },
  { kind: "metric", primary: "bme688_humidity_pct" },
  { kind: "wind_combo" },
  { kind: "metric", primary: "scd41_temp_c" },
  { kind: "metric", primary: "scd41_humid_pct" },
  { kind: "metric", primary: "bme688_pressure_hpa" },
  { kind: "metric", primary: "scd41_co2_ppm", paired: "scd41_co2_ppm_max" },
  { kind: "metric", primary: "ze03_co_ppm", paired: "ze03_co_ppm_max" },
  { kind: "metric", primary: "bme688_gas_ohms" },
  { kind: "metric", primary: "sps30_pm2_5", paired: "sps30_pm2_5_max" },
  { kind: "metric", primary: "sps30_typical_size" },
  { kind: "metric", primary: "bme688_gas_ohms_ratio_ah_adj" },
];

const WIND_COMBO_METRICS = [
  "weather_kit_anemometer_wind_avg_ms",
  "weather_kit_anemometer_wind_speed_ms",
  "weather_kit_anemometer_wind_gust_ms_max",
  "weather_kit_anemometer_wind_gust_ms",
  "wind_vane_degrees_avg",
  "wind_vane_degrees",
] as const;

function headlineMetricNames(): string[] {
  const names = new Set<string>();
  for (const slot of HEADLINE_SLOTS) {
    if (slot.kind === "wind_combo") {
      for (const m of WIND_COMBO_METRICS) names.add(m);
    } else {
      names.add(slot.primary);
      if (slot.paired) names.add(slot.paired);
    }
  }
  return [...names];
}

/** Metrics that already have a dedicated Key Metrics chart (excludes wind combo feeds). */
function keyMetricsOccupiedNames(): Set<string> {
  const names = new Set<string>();
  for (const slot of HEADLINE_SLOTS) {
    if (slot.kind === "metric") {
      names.add(slot.primary);
      if (slot.paired) names.add(slot.paired);
    }
  }
  return names;
}

/**
 * Additional metrics — ordered by theme (remaining PM → VOC → wind → rain → sample count).
 * Pair members are listed with their primary; renderAllChart skips duplicate pair renders.
 */
const ADDITIONAL_METRICS_ORDERED: string[] = [
  // Remaining PM
  "sps30_pm1_0",
  "sps30_pm1_0_max",
  "sps30_pm4_0",
  "sps30_pm4_0_max",
  "sps30_pm10",
  "sps30_pm10_max",
  "sps30_nc0_5",
  "sps30_nc1_0",
  "sps30_nc2_5",
  "sps30_nc4_0",
  "sps30_nc10",
  // Remaining VOC / humidity-related
  "avg_absolute_humidity_g_m3",
  "bme688_gas_ohms_ah_normalized",
  "bme688_gas_ohms_ratio",
  "bme688_gas_ohms_baseline",
  "bme688_gas_ohms_ah_baseline",
  "bme688_gas_ohms_log",
  "bme688_gas_ohms_min",
  // Remaining wind (combo lives in Key Metrics; these are the line charts)
  "weather_kit_anemometer_wind_avg_ms",
  "weather_kit_anemometer_wind_gust_ms_max",
  "weather_kit_anemometer_wind_gust_ms",
  "weather_kit_anemometer_wind_min_ms",
  "weather_kit_anemometer_wind_speed_ms",
  // Rain
  "weather_kit_rain_gauge_rain_interval_mm",
  "weather_kit_rain_gauge_rain_hourly_mm",
  "weather_kit_rain_gauge_tips_interval",
  // Anemometer sample count
  "weather_kit_anemometer_sample_count",
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

function getAdditionalReadingMetricNames(catalog: Catalog): string[] {
  const occupied = keyMetricsOccupiedNames();
  const healthPanelSet = new Set<string>(HEALTH_PANEL_READING_CHARTS);
  const windVaneNames = new Set([
    "wind_vane_degrees",
    "wind_vane_degrees_avg",
    "wind_vane_voltage",
  ]);

  const ordered = ADDITIONAL_METRICS_ORDERED.filter(
    (name) =>
      catalog.metrics[name] &&
      !occupied.has(name) &&
      !healthPanelSet.has(name) &&
      !windVaneNames.has(name)
  );

  // Append any leftover numeric readings not in the ordered list (forward-compatible).
  const orderedSet = new Set([...ordered, ...occupied, ...healthPanelSet, ...windVaneNames]);
  const leftovers = Object.values(catalog.metrics)
    .filter(
      (m) =>
        m.source === "readings" &&
        m.type === "numeric" &&
        !orderedSet.has(m.name)
    )
    .map((m) => m.name)
    .sort();

  return [...ordered, ...leftovers];
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
  const navigate = useNavigate();
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

  const headlineMetricNamesList = useMemo(() => headlineMetricNames(), []);

  const {
    data: headlineHistoryData,
    error: headlineError,
    isLoading: headlineLoading,
    isValidating: headlineValidating,
    retry: retryHeadlines,
  } = useNodeHistory(
    nodeId ?? "",
    "readings",
    headlineMetricNamesList,
    chartSelection
  );

  const headlinesOk = !!headlineHistoryData;
  // Deep history: gate follow-on GCS pulls until headlines succeed (avoid stampedes on 503).
  const followOnEnabled = !deepHistory || headlinesOk;

  // ── "Show all" additional metrics query ──────────────────────────────────

  const allReadingNames = useMemo(
    () => (catalog ? getAdditionalReadingMetricNames(catalog) : []),
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
  if (!fleet || !node) {
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

  function renderHeadlineSlot(slot: HeadlineSlot, idx: number) {
    const showSkeleton = headlineChartsBusy && !headlineSeries;

    if (slot.kind === "wind_combo") {
      const avgData =
        headlineSeries?.["weather_kit_anemometer_wind_avg_ms"] ??
        headlineSeries?.["weather_kit_anemometer_wind_speed_ms"] ??
        [];
      const peakData =
        headlineSeries?.["weather_kit_anemometer_wind_gust_ms_max"] ??
        headlineSeries?.["weather_kit_anemometer_wind_gust_ms"] ??
        [];
      const dirData =
        headlineSeries?.["wind_vane_degrees_avg"] ??
        headlineSeries?.["wind_vane_degrees"] ??
        [];
      const hasAny = hasData(avgData) || hasData(peakData) || hasData(dirData);

      return (
        <ChartCard key={idx} title="Wind Speed & Direction">
          {showSkeleton ? (
            <ChartSkeleton />
          ) : !hasAny ? (
            <ChartEmpty
              label="Wind"
              detail="Try a shorter time window if the weather kit recently went offline."
            />
          ) : (
            <div className="h-[220px] min-w-0">
              <WeatherWindChart
                avgData={avgData}
                peakData={peakData}
                dirData={dirData}
                window={axisWindow}
              />
            </div>
          )}
        </ChartCard>
      );
    }

    const primaryMeta: MetricMetadata | undefined = cat.metrics[slot.primary];
    if (!primaryMeta) return null;

    if (slot.paired) {
      const pairedMeta = cat.metrics[slot.paired];
      if (!pairedMeta) return null;

      const avgData = headlineSeries?.[slot.primary] ?? [];
      const peakData = headlineSeries?.[slot.paired] ?? [];
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

    const data = headlineSeries?.[slot.primary] ?? [];
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
          <div className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="node-detail-selector">
              Select node
            </label>
            <select
              id="node-detail-selector"
              value={nodeId}
              onChange={(e) => navigate(`/nodes/${e.target.value}`)}
              className="text-xl font-semibold text-slate-900 bg-transparent border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 max-w-full"
            >
              {fleet.nodes.map((n) => (
                <option key={n.nodeId} value={n.nodeId}>
                  {n.nodeId}
                </option>
              ))}
            </select>
          </div>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
          {HEADLINE_SLOTS.map((slot, i) => renderHeadlineSlot(slot, i))}
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
