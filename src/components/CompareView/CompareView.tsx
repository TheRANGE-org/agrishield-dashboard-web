import { useState } from "react";
import { useFleet } from "../../hooks/useFleet";
import { useMetadata } from "../../hooks/useMetadata";
import { useNodeHistory } from "../../hooks/useNodeHistory";
import type { AxisWindow, ChartTimeSelection } from "../../lib/timeWindow";
import { chartAxisWindow } from "../../lib/timeWindow";
import ChartTimeControls from "../NodeDetail/ChartTimeControls";
import MetricChart from "../NodeDetail/MetricChart";
import { ChartSkeleton, ChartEmpty } from "../NodeDetail/MetricChart";
import PairedChart from "../NodeDetail/PairedChart";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import ChartLoadingOverlay from "../shared/ChartLoadingOverlay";
import { transformQueryResponse, hasData } from "../../lib/chartData";
import type { Catalog, MetricMetadata } from "../../api/types";

/** Telemetry health metrics exposed in Compare (battery + network). */
const COMPARE_TELEMETRY_METRICS = [
  "sensor_health_battery_percentage",
  "system_health_network_latency_ms",
  "system_health_wifi_signal_level_dbm",
  "system_health_uplink_gateway_ok",
  "system_health_uplink_internet_ok",
  "system_health_tailscale_online",
  "system_health_queue_pending_batches",
] as const;

function getCompareMetrics(catalog: Catalog): MetricMetadata[] {
  const readings = Object.values(catalog.metrics).filter(
    (m) => m.source === "readings" && m.type === "numeric"
  );

  const subordinates = new Set(
    readings.map((m) => m.pairs_with).filter(Boolean) as string[]
  );

  const readingPrimaries = readings.filter(
    (m) =>
      !subordinates.has(m.name) &&
      // Instant heading is noisy; voltage is diagnostic-only. Avg circular mean is the fire-origin signal.
      m.name !== "wind_vane_degrees" &&
      !m.name.includes("wind_vane_voltage")
  );

  const telemetry: MetricMetadata[] = [];
  for (const name of COMPARE_TELEMETRY_METRICS) {
    const m = catalog.metrics[name];
    if (m && m.type === "numeric") telemetry.push(m);
  }

  return [...readingPrimaries, ...telemetry].sort((a, b) =>
    a.label.localeCompare(b.label)
  );
}

function NodeMetricRow({
  nodeId,
  metric,
  pairMetric,
  selection,
  axisWindow,
}: {
  nodeId: string;
  metric: MetricMetadata;
  pairMetric?: MetricMetadata;
  selection: ChartTimeSelection;
  axisWindow: AxisWindow;
}) {
  const source = metric.source === "telemetry" ? "telemetry" : "readings";
  const metricsToFetch = pairMetric ? [metric.name, pairMetric.name] : [metric.name];

  const { data: historyData, isLoading, isValidating } = useNodeHistory(
    nodeId,
    source,
    metricsToFetch,
    selection
  );

  const series = historyData ? transformQueryResponse(historyData.response) : null;
  const data = series?.[metric.name] ?? [];
  const pairData = pairMetric ? (series?.[pairMetric.name] ?? []) : [];
  const chartsBusy = isLoading || isValidating;

  const hasAny = pairMetric ? hasData(data) || hasData(pairData) : hasData(data);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-800">{nodeId}</h3>
      </div>
      <div className="relative px-2 pt-2 pb-4 h-[240px]">
        <ChartLoadingOverlay active={chartsBusy} />
        {chartsBusy && !series ? (
          <ChartSkeleton />
        ) : !hasAny ? (
          <ChartEmpty
            label={
              pairMetric ? `${metric.label} / ${pairMetric.label}` : metric.label
            }
          />
        ) : pairMetric ? (
          <PairedChart
            avgMetric={metric}
            peakMetric={pairMetric}
            avgData={data}
            peakData={pairData}
            window={axisWindow}
          />
        ) : (
          <MetricChart metric={metric} data={data} window={axisWindow} />
        )}
      </div>
    </div>
  );
}

export default function CompareView() {
  const { fleet, isLoading: fleetLoading, error: fleetError } = useFleet();
  const { catalog, isLoading: catalogLoading } = useMetadata();
  const [chartSelection, setChartSelection] = useState<ChartTimeSelection>({
    kind: "preset",
    window: "24h",
  });
  const [selectedMetricName, setSelectedMetricName] = useState<string>("");
  const axisWindow = chartAxisWindow(chartSelection);

  if (fleetLoading || catalogLoading) return <LoadingState message="Loading..." />;
  if (fleetError) return <ErrorState message="Error" detail={fleetError.message} />;
  if (!fleet || !catalog) return null;

  const compareMetrics = getCompareMetrics(catalog);
  const currentMetricName = selectedMetricName || compareMetrics[0]?.name;

  const metric = catalog.metrics[currentMetricName];
  if (!metric) return null;

  // Prefer catalog pairs_with when the pair is also numeric (e.g. battery % ↔ V).
  const pairName = metric.pairs_with;
  const pairMetric =
    pairName && catalog.metrics[pairName]?.type === "numeric"
      ? catalog.metrics[pairName]
      : Object.values(catalog.metrics).find((m) => m.pairs_with === currentMetricName);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Compare Nodes</h1>
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={currentMetricName}
            onChange={(e) => setSelectedMetricName(e.target.value)}
            className="block w-full sm:w-auto pl-3 pr-10 py-1.5 text-sm border border-slate-300 focus:outline-none focus:ring-green-500 focus:border-green-500 rounded-md"
          >
            {compareMetrics.map((m) => (
              <option key={m.name} value={m.name}>
                {m.label}
                {m.source === "telemetry" ? " (health)" : ""}
              </option>
            ))}
          </select>
          <ChartTimeControls value={chartSelection} onChange={setChartSelection} />
        </div>
      </div>

      <div className="space-y-2">
        {fleet.nodes.map((node) => (
          <NodeMetricRow
            key={node.nodeId}
            nodeId={node.nodeId}
            metric={metric}
            pairMetric={pairMetric}
            selection={chartSelection}
            axisWindow={axisWindow}
          />
        ))}
      </div>
    </div>
  );
}
