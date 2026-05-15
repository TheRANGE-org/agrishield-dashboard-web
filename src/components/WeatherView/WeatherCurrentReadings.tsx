import { useMemo } from "react";
import GaugeCard from "./GaugeCard";
import { msToMph, getCompassDirection, celsiusToFahrenheit, hpaToInHg } from "../../lib/weatherUnits";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import type { MetricSeriesMap } from "../../lib/chartData";

interface Props {
  series: MetricSeriesMap | null;
}

export default function WeatherCurrentReadings({ series }: Props) {
  const stats = useMemo(() => {
    if (!series) return null;
    
    function getStats(key: string, convertFn: (v: number) => number) {
      const data = series![key] ?? [];
      const valid = data.filter(d => typeof d.value === "number") as {ts: number, value: number}[];
      if (valid.length === 0) return { current: null, min: null, max: null, spark: [] };
      
      const spark = valid.slice(-60).map(d => ({ value: convertFn(d.value) })); // last 60 points
      
      let min = valid[0].value;
      let max = valid[0].value;
      for (const d of valid) {
        if (d.value < min) min = d.value;
        if (d.value > max) max = d.value;
      }
      
      return {
        current: convertFn(valid[valid.length - 1].value),
        min: convertFn(min),
        max: convertFn(max),
        spark
      };
    }
    
    // Wind stats
    const windAvgData = series["weather_kit_anemometer_wind_avg_ms"] ?? series["weather_kit_anemometer_wind_speed_ms"] ?? [];
    const windMinData = series["weather_kit_anemometer_wind_min_ms"] ?? [];
    const windMaxData = series["weather_kit_anemometer_wind_gust_ms_max"] ?? series["weather_kit_anemometer_wind_gust_ms"] ?? [];
    const windDirData = series["wind_vane_degrees_avg"] ?? series["wind_vane_degrees"] ?? [];
    
    const getLatest = (arr: {value: number | null}[]) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        if (typeof arr[i].value === "number") return arr[i].value;
      }
      return null;
    };
    
    return {
      temp: getStats("bme688_temperature_c", celsiusToFahrenheit),
      hum: getStats("bme688_humidity_pct", v => v),
      pres: getStats("bme688_pressure_hpa", hpaToInHg),
      wind: {
        avg: getLatest(windAvgData),
        min: getLatest(windMinData),
        peak: getLatest(windMaxData),
        dir: getLatest(windDirData)
      }
    };
  }, [series]);

  if (!stats) return null;

  const tempPct = stats.temp.current ? ((stats.temp.current - 0) / 120) * 100 : 0;
  const humPct = stats.hum.current ? stats.hum.current : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Temp */}
      <GaugeCard
        title="Temperature"
        currentValue={stats.temp.current != null ? stats.temp.current.toFixed(1) : "—"}
        subtext="°F"
        minLabel={stats.temp.min != null ? `L: ${stats.temp.min.toFixed(1)}°` : "—"}
        maxLabel={stats.temp.max != null ? `H: ${stats.temp.max.toFixed(1)}°` : "—"}
        percentage={tempPct}
        color="#ea580c"
      />
      
      {/* Humidity */}
      <GaugeCard
        title="Humidity"
        currentValue={stats.hum.current != null ? Math.round(stats.hum.current).toString() : "—"}
        subtext="%"
        minLabel={stats.hum.min != null ? `L: ${Math.round(stats.hum.min)}%` : "—"}
        maxLabel={stats.hum.max != null ? `H: ${Math.round(stats.hum.max)}%` : "—"}
        percentage={humPct}
        color="#0284c7"
      />

      {/* Pressure */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between h-36">
        <h3 className="text-sm font-medium text-slate-700 w-full text-left mb-1">Atmospheric Pressure</h3>
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-900">
            {stats.pres.current != null ? stats.pres.current.toFixed(2) : "—"}
          </span>
          <span className="text-xs text-slate-500 font-medium mt-1">inHg</span>
        </div>
        
        {/* Sparkline */}
        <div className="w-full h-8 mt-2 -ml-2">
          {stats.pres.spark.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.pres.spark}>
                <YAxis domain={["dataMin", "dataMax"]} hide />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#94a3b8" 
                  strokeWidth={2} 
                  dot={false} 
                  isAnimationActive={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Wind */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between h-36">
        <h3 className="text-sm font-medium text-slate-700 w-full text-left mb-1">Wind</h3>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-bold text-slate-900">
              {stats.wind.avg != null ? msToMph(stats.wind.avg).toFixed(1) : "—"}
            </span>
            <span className="text-xs text-slate-500 font-medium mb-1.5">mph</span>
          </div>
          <span className="text-sm font-semibold text-sky-700 mt-1">
            {getCompassDirection(stats.wind.dir)} {stats.wind.dir != null ? `(${Math.round(stats.wind.dir)}°)` : ""}
          </span>
        </div>
        <div className="w-full flex justify-between mt-2 px-2 text-xs font-semibold text-slate-400">
          <span>Min: {stats.wind.min != null ? Math.round(msToMph(stats.wind.min)) : "—"}</span>
          <span>Peak: {stats.wind.peak != null ? Math.round(msToMph(stats.wind.peak)) : "—"}</span>
        </div>
      </div>
    </div>
  );
}
