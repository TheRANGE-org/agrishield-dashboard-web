import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { DataPoint } from "../../lib/chartData";
import type { AxisWindow } from "../../lib/timeWindow";
import { formatTimeForWindow, formatTooltipTime } from "../../lib/timeWindow";
import { mmToInches } from "../../lib/weatherUnits";
import { useContainerSize } from "../../hooks/useContainerSize";
import { ChartEmpty } from "../NodeDetail/MetricChart";

interface Props {
  intervalData: DataPoint[];
  window: AxisWindow;
}

const RAIN_COLOR = "#2563eb"; // blue-600

interface TooltipPayloadItem {
  value: number | null;
  payload: { ts: number; inches: number | null };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  window: AxisWindow;
}

function CustomTooltip({ active, payload, window }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  const inches = point.value;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="text-slate-500">{formatTooltipTime(point.payload.ts, window)}</p>
      <p className="font-semibold" style={{ color: RAIN_COLOR }}>
        {inches == null
          ? "—"
          : `${inches < 0.01 && inches > 0 ? inches.toFixed(3) : inches.toFixed(2)} in`}
      </p>
    </div>
  );
}

export default function WeatherRainChart({ intervalData, window }: Props) {
  const { ref, width, height } = useContainerSize();

  const chartData = intervalData
    .map((p) => ({
      ts: p.ts,
      inches: typeof p.value === "number" ? mmToInches(p.value) : null,
    }))
    .filter((p) => p.inches != null)
    .sort((a, b) => a.ts - b.ts);

  if (chartData.length === 0) {
    return <ChartEmpty label="rainfall" />;
  }

  const maxInches = Math.max(...chartData.map((d) => d.inches ?? 0), 0);
  const yMax = maxInches <= 0 ? 0.1 : maxInches * 1.15;

  return (
    <div ref={ref} className="w-full h-full relative" style={{ aspectRatio: "2 / 1", minHeight: 0, minWidth: 0 }}>
      {width > 0 && height > 0 && (
        <BarChart width={width} height={height} data={chartData} barCategoryGap="10%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="ts"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(ts) => formatTimeForWindow(ts, window)}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            minTickGap={40}
          />
          <YAxis
            domain={[0, yMax]}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={(val) => (val < 0.1 ? val.toFixed(2) : val.toFixed(1))}
            width={44}
            axisLine={false}
            tickLine={false}
            unit=" in"
          />
          <Tooltip content={<CustomTooltip window={window} />} />
          <Bar
            name="Rainfall"
            dataKey="inches"
            fill={RAIN_COLOR}
            fillOpacity={0.85}
            isAnimationActive={false}
            maxBarSize={28}
          />
        </BarChart>
      )}
    </div>
  );
}
