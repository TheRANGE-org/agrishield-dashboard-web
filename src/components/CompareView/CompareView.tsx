import { useState } from "react";
import { useFleet } from "../../hooks/useFleet";
import { useMetadata } from "../../hooks/useMetadata";
import { useNodeHistory } from "../../hooks/useNodeHistory";
import type { TimeWindow } from "../../lib/timeWindow";
import TimeWindowSelector from "../NodeDetail/TimeWindowSelector";
import MetricChart from "../NodeDetail/MetricChart";
import { ChartSkeleton, ChartEmpty } from "../NodeDetail/MetricChart";
import PairedChart from "../NodeDetail/PairedChart";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import ChartLoadingOverlay from "../shared/ChartLoadingOverlay";
import { transformQueryResponse, hasData } from "../../lib/chartData";
import type { Catalog, MetricMetadata } from "../../api/types";

function getCompareMetrics(catalog: Catalog) {
  const metrics = Object.values(catalog.metrics).filter(
    (m) => m.source === "readings" && m.type === "numeric"
  );
  
  const subordinates = new Set(metrics.map((m) => m.pairs_with).filter(Boolean));
  
  return metrics
    .filter(
      (m) =>
        !subordinates.has(m.name) &&
        !m.name.includes("wind_vane_degrees") &&
        !m.name.includes("wind_vane_voltage")
    )
    .sort((a, b) => a.label.localeCompare(b.label));
}

function NodeMetricRow({
  nodeId,
  metric,
  pairMetric,
  window
}: {
  nodeId: string;
  metric: MetricMetadata;
  pairMetric?: MetricMetadata;
  window: TimeWindow;
}) {
  const metricsToFetch = pairMetric ? [metric.name, pairMetric.name] : [metric.name];
  
  const { data: historyData, isLoading, isValidating } = useNodeHistory(
    nodeId,
    "readings",
    metricsToFetch,
    { kind: "preset", window }
  );

  const series = historyData ? transformQueryResponse(historyData.response) : null;
  const data = series?.[metric.name] ?? [];
  const pairData = pairMetric ? (series?.[pairMetric.name] ?? []) : [];
  const chartsBusy = isLoading || isValidating;
  
  const hasAny = pairMetric ? (hasData(data) || hasData(pairData)) : hasData(data);

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
          <ChartEmpty label={pairMetric ? `${metric.label} / ${pairMetric.label}` : metric.label} />
        ) : pairMetric ? (
          <PairedChart
            avgMetric={metric}
            peakMetric={pairMetric}
            avgData={data}
            peakData={pairData}
            window={window}
          />
        ) : (
          <MetricChart metric={metric} data={data} window={window} />
        )}
      </div>
    </div>
  );
}

export default function CompareView() {
  const { fleet, isLoading: fleetLoading, error: fleetError } = useFleet();
  const { catalog, isLoading: catalogLoading } = useMetadata();
  const [window, setWindow] = useState<TimeWindow>("24h");
  const [selectedMetricName, setSelectedMetricName] = useState<string>("");

  if (fleetLoading || catalogLoading) return <LoadingState message="Loading..." />;
  if (fleetError) return <ErrorState message="Error" detail={fleetError.message} />;
  if (!fleet || !catalog) return null;

  const compareMetrics = getCompareMetrics(catalog);
  const currentMetricName = selectedMetricName || compareMetrics[0]?.name;
  
  const metric = catalog.metrics[currentMetricName];
  if (!metric) return null;
  
  const pairMetric = Object.values(catalog.metrics).find(m => m.pairs_with === currentMetricName);

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
            {compareMetrics.map(m => (
              <option key={m.name} value={m.name}>{m.label}</option>
            ))}
          </select>
          <TimeWindowSelector value={window} onChange={setWindow} />
        </div>
      </div>

      <div className="space-y-2">
        {fleet.nodes.map(node => (
          <NodeMetricRow 
            key={node.nodeId} 
            nodeId={node.nodeId} 
            metric={metric} 
            pairMetric={pairMetric} 
            window={window} 
          />
        ))}
      </div>
    </div>
  );
}
