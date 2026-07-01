import { useState } from "react";
import { useFleet } from "../../hooks/useFleet";
import { useMetadata } from "../../hooks/useMetadata";
import { useNodeHistory } from "../../hooks/useNodeHistory";
import type { TimeWindow } from "../../lib/timeWindow";
import TimeWindowSelector from "../NodeDetail/TimeWindowSelector";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import ChartLoadingOverlay from "../shared/ChartLoadingOverlay";
import { transformQueryResponse } from "../../lib/chartData";
import WeatherCurrentReadings from "./WeatherCurrentReadings";

import WeatherMetricChart from "./WeatherMetricChart";
import WeatherWindChart from "./WeatherWindChart";
import { celsiusToFahrenheit, hpaToInHg } from "../../lib/weatherUnits";

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

  const { data: historyData, isLoading: historyLoading, isValidating: historyValidating } = useNodeHistory(
    activeNodeId,
    "readings",
    WEATHER_METRICS,
    { kind: "preset", window }
  );

  const historyBusy = historyLoading || historyValidating;

  if (fleetLoading || catalogLoading) return <LoadingState message="Loading..." />;
  if (fleetError) return <ErrorState message="Error" detail={fleetError.message} />;
  if (!fleet || !catalog) return null;

  const tempM = catalog.metrics["bme688_temperature_c"];
  const humM = catalog.metrics["bme688_humidity_pct"];
  const presM = catalog.metrics["bme688_pressure_hpa"];

  if (!tempM || !humM || !presM) return null;

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

      {historyBusy && !series ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-slate-200 border-t-sky-600" />
        </div>
      ) : series ? (
        <div className="relative">
          <ChartLoadingOverlay active={historyBusy} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-800">Temperature</h3>
            </div>
            <div className="px-2 pt-2 pb-4 h-[240px]">
              <WeatherMetricChart
                metric={tempM}
                data={series["bme688_temperature_c"] ?? []}
                window={window}
                unit="°F"
                convertFn={celsiusToFahrenheit}
              />
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-800">Humidity</h3>
            </div>
            <div className="px-2 pt-2 pb-4 h-[240px]">
              <WeatherMetricChart
                metric={humM}
                data={series["bme688_humidity_pct"] ?? []}
                window={window}
                unit="%"
                convertFn={(v) => v}
              />
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-800">Atmospheric Pressure</h3>
            </div>
            <div className="px-2 pt-2 pb-4 h-[240px]">
              <WeatherMetricChart
                metric={presM}
                data={series["bme688_pressure_hpa"] ?? []}
                window={window}
                unit="inHg"
                convertFn={hpaToInHg}
              />
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-800">Wind Speed & Direction</h3>
            </div>
            <div className="px-2 pt-2 pb-4 h-[240px]">
              <WeatherWindChart
                avgData={series["weather_kit_anemometer_wind_avg_ms"] ?? series["weather_kit_anemometer_wind_speed_ms"] ?? []}
                peakData={series["weather_kit_anemometer_wind_gust_ms_max"] ?? series["weather_kit_anemometer_wind_gust_ms"] ?? []}
                dirData={series["wind_vane_degrees_avg"] ?? series["wind_vane_degrees"] ?? []}
                window={window}
              />
            </div>
          </div>
        </div>
        </div>
      ) : null}
    </div>
  );
}
