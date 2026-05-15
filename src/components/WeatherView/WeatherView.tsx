import { useState } from "react";
import { useFleet } from "../../hooks/useFleet";
import { useMetadata } from "../../hooks/useMetadata";
import { useNodeHistory } from "../../hooks/useNodeHistory";
import type { TimeWindow } from "../../lib/timeWindow";
import TimeWindowSelector from "../NodeDetail/TimeWindowSelector";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import { transformQueryResponse } from "../../lib/chartData";
import WeatherCurrentReadings from "./WeatherCurrentReadings";

// The metrics needed for the Weather view
const WEATHER_METRICS = [
  "bme688_temperature_c",
  "bme688_humidity_pct",
  "bme688_pressure_hpa",
  "weather_kit_anemometer_wind_speed_ms",
  "weather_kit_anemometer_wind_avg_ms",
  "weather_kit_anemometer_wind_gust_ms",
  "weather_kit_anemometer_wind_gust_ms_max",
  "weather_kit_anemometer_wind_min_ms",
  "wind_vane_degrees",
  "wind_vane_degrees_avg",
];

export default function WeatherView() {
  const { fleet, isLoading: fleetLoading, error: fleetError } = useFleet();
  const { catalog, isLoading: catalogLoading } = useMetadata();
  const [window, setWindow] = useState<TimeWindow>("24h");
  
  // Default to first node
  const defaultNode = fleet?.nodes[0]?.nodeId;
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");

  const activeNodeId = selectedNodeId || defaultNode || "";

  const { data: historyData, isLoading: historyLoading } = useNodeHistory(
    activeNodeId,
    "readings",
    WEATHER_METRICS,
    window
  );

  if (fleetLoading || catalogLoading) return <LoadingState message="Loading..." />;
  if (fleetError) return <ErrorState message="Error" detail={fleetError.message} />;
  if (!fleet || !catalog) return null;

  const series = historyData ? transformQueryResponse(historyData.response) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Localized Weather</h1>
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={activeNodeId}
            onChange={(e) => setSelectedNodeId(e.target.value)}
            className="block w-full sm:w-auto pl-3 pr-10 py-1.5 text-sm border border-slate-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 rounded-md"
          >
            {fleet.nodes.map(n => (
              <option key={n.nodeId} value={n.nodeId}>{n.nodeId}</option>
            ))}
          </select>
          <TimeWindowSelector value={window} onChange={setWindow} />
        </div>
      </div>

      <WeatherCurrentReadings series={series} />

      {/* Graphs to be built in Phase 2 */}
      {historyLoading && !series ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-slate-200 border-t-sky-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-slate-500">
          <span className="mb-2 text-3xl">⛅️</span>
          <p>Weather Graphs (Phase 2) will appear here</p>
        </div>
      )}
    </div>
  );
}
