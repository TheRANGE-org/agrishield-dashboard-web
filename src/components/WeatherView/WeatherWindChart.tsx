import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { DataPoint } from "../../lib/chartData";
import type { TimeWindow } from "../../lib/timeWindow";
import { formatTimeForWindow, formatTooltipTime } from "../../lib/timeWindow";
import { msToMph, getCompassDirection } from "../../lib/weatherUnits";
import { useContainerSize } from "../../hooks/useContainerSize";
import { ChartEmpty } from "../NodeDetail/MetricChart";

interface Props {
  avgData: DataPoint[];
  peakData: DataPoint[];
  dirData: DataPoint[];
  window: TimeWindow;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  dataKey: string;
  value: number | null;
  payload: { ts: number; avg: number | null; peak: number | null; dir: number | null };
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number;
  window: TimeWindow;
}

function CustomTooltip({ active, payload, label, window }: CustomTooltipProps) {
  if (!active || !payload?.length || label === undefined) return null;

  const fmt = (v: number | null) =>
    v === null
      ? "—"
      : `${typeof v === "number" && !Number.isInteger(v) ? v.toFixed(1) : v} mph`;

  const avgPoint = payload.find((p) => p.dataKey === "avg");
  const peakPoint = payload.find((p) => p.dataKey === "peak");
  
  const dir = avgPoint?.payload?.dir ?? peakPoint?.payload?.dir;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="text-slate-500">{formatTooltipTime(label, window)}</p>
      {avgPoint && (
        <p className="font-semibold" style={{ color: avgPoint.color }}>
          Average: {fmt(avgPoint.value)}
        </p>
      )}
      {peakPoint && (
        <p className="font-semibold" style={{ color: peakPoint.color }}>
          Peak Gust: {fmt(peakPoint.value)}
        </p>
      )}
      {dir != null && (
        <p className="text-slate-500 font-medium">
          Direction: {getCompassDirection(dir)} ({Math.round(dir)}°)
        </p>
      )}
    </div>
  );
}

// ─── WeatherWindChart ─────────────────────────────────────────────────────────

export default function WeatherWindChart({
  avgData,
  peakData,
  dirData,
  window,
}: Props) {
  const { ref, width, height } = useContainerSize();

  // Merge series on ts
  const tsSet = new Map<number, { ts: number, avg: number | null; peak: number | null, dir: number | null }>();

  for (const p of avgData) {
    tsSet.set(p.ts, { ts: p.ts, avg: typeof p.value === "number" ? msToMph(p.value) : null, peak: null, dir: null });
  }
  for (const p of peakData) {
    const existing = tsSet.get(p.ts);
    if (existing) {
      existing.peak = typeof p.value === "number" ? msToMph(p.value) : null;
    } else {
      tsSet.set(p.ts, { ts: p.ts, avg: null, peak: typeof p.value === "number" ? msToMph(p.value) : null, dir: null });
    }
  }
  for (const p of dirData) {
    const existing = tsSet.get(p.ts);
    if (existing) {
      existing.dir = typeof p.value === "number" ? p.value : null;
    } else {
      tsSet.set(p.ts, { ts: p.ts, avg: null, peak: null, dir: typeof p.value === "number" ? p.value : null });
    }
  }

  const merged = Array.from(tsSet.values()).sort((a, b) => a.ts - b.ts);

  if (merged.length === 0) {
    return <ChartEmpty label="Wind" />;
  }

  // Determine spacing for arrow indicators based on time window
  let intervalMs = 3600 * 1000;
  if (window === "1h") intervalMs = 10 * 60 * 1000; // Every 10 mins
  else if (window === "6h") intervalMs = 60 * 60 * 1000; // Every 1 hour
  else if (window === "24h") intervalMs = 2 * 3600 * 1000; // Every 2 hours
  else if (window === "7d") intervalMs = 24 * 3600 * 1000; // Every 1 day
  else intervalMs = 3 * 24 * 3600 * 1000; // Every 3 days for 30d

  const arrowTicks: number[] = [];
  const tsDirMap = new Map<number, number>();

  let currentBucket: number | null = null;
  for (const p of merged) {
    const bucket = Math.floor(p.ts / intervalMs);
    if (bucket !== currentBucket) {
      if (p.dir !== null) {
        currentBucket = bucket;
        arrowTicks.push(p.ts);
        // Reverse direction: sensor reading is where wind is coming FROM, arrow should show where it's blowing TO
        tsDirMap.set(p.ts, (p.dir + 180) % 360);
      }
    }
  }

  interface CustomArrowTickProps {
    x?: number;
    y?: number;
    payload?: { value: number };
  }

  const CustomArrowTick = (props: CustomArrowTickProps) => {
    const { x, y, payload } = props;
    if (x === undefined || y === undefined || payload === undefined || payload.value === undefined) return null;
    const rotation = tsDirMap.get(payload.value);
    if (rotation == null) return null;
    
    return (
      <svg 
        x={x - 8} 
        y={y} 
        width={16} 
        height={16} 
        viewBox="0 0 24 24" 
        style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "center" }}
      >
        <path 
          d="M12 4L12 20M12 4L7 9M12 4L17 9" 
          stroke="#0284c7" 
          strokeWidth={2.5} 
          fill="none" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </svg>
    );
  };

  return (
    <div ref={ref} className="w-full h-full relative" style={{ aspectRatio: "2 / 1", minHeight: 0, minWidth: 0 }}>
      {width > 0 && height > 0 && (
        <ComposedChart width={width} height={height} data={merged}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            xAxisId={0}
            dataKey="ts"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(ts) => formatTimeForWindow(ts, window)}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            minTickGap={30}
          />
          {/* Secondary X-Axis for Direction Arrows */}
          <XAxis
            xAxisId={1}
            dataKey="ts"
            type="number"
            domain={["dataMin", "dataMax"]}
            axisLine={false}
            tickLine={false}
            ticks={arrowTicks}
            tick={<CustomArrowTick />}
            height={24}
          />
          <YAxis
            domain={[0, "auto"]}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={(val) => val.toFixed(0)}
            width={40}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip window={window} />} />
          <Legend
            verticalAlign="bottom"
            height={24}
            iconType="plainline"
            wrapperStyle={{ fontSize: 11, color: "#64748b" }}
          />
          <Line
            xAxisId={0}
            name="Peak Gust"
            type="monotone"
            dataKey="peak"
            stroke="#bae6fd" // sky-200
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            xAxisId={0}
            name="Average Speed"
            type="monotone"
            dataKey="avg"
            stroke="#0ea5e9" // sky-500
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </ComposedChart>
      )}
    </div>
  );
}
