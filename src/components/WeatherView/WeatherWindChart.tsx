import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Scatter,
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

function CustomTooltip({ active, payload, label, window }: any) {
  if (!active || !payload?.length || label === undefined) return null;

  const fmt = (v: number | null) =>
    v === null
      ? "—"
      : `${typeof v === "number" && !Number.isInteger(v) ? v.toFixed(1) : v} mph`;

  const avgPoint = payload.find((p: any) => p.dataKey === "avg");
  const peakPoint = payload.find((p: any) => p.dataKey === "peak");
  
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

// ─── Custom Arrow Shape ───────────────────────────────────────────────────────

const CustomArrow = (props: any) => {
  const { cx, cy, payload } = props;
  if (payload.arrow_dir == null) return null;
  const rotation = payload.arrow_dir;
  
  return (
    <svg 
      x={cx - 10} 
      y={cy - 10} 
      width={20} 
      height={20} 
      viewBox="0 0 24 24" 
      style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "center" }}
      className="drop-shadow-sm"
    >
      <circle cx="12" cy="12" r="9" fill="white" fillOpacity={0.8} />
      <path 
        d="M12 4L12 20M12 4L7 9M12 4L17 9" 
        stroke="#0284c7" 
        strokeWidth={2} 
        fill="none" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
};

// ─── WeatherWindChart ─────────────────────────────────────────────────────────

export default function WeatherWindChart({
  avgData,
  peakData,
  dirData,
  window,
}: Props) {
  const { ref, width, height } = useContainerSize();

  // Merge series on ts
  const tsSet = new Map<number, { ts: number, avg: number | null; peak: number | null, dir: number | null, arrow_dir?: number | null }>();

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

  // Downsample arrows: 1 hour bucket for < 7d, 1 day bucket for >= 7d
  const intervalMs = (window === "7d" || window === "30d") ? 86400 * 1000 : 3600 * 1000;
  let currentBucket: number | null = null;

  for (const p of merged) {
    const bucket = Math.floor(p.ts / intervalMs);
    if (bucket !== currentBucket) {
      if (p.dir !== null && p.avg !== null) {
        currentBucket = bucket;
        p.arrow_dir = p.dir;
      }
    }
  }

  return (
    <div ref={ref} className="w-full h-full relative" style={{ aspectRatio: "2 / 1", minHeight: 0, minWidth: 0 }}>
      {width > 0 && height > 0 && (
        <ComposedChart width={width} height={height} data={merged}>
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
            minTickGap={30}
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
            wrapperStyle={{ fontSize: 11, paddingTop: 12, color: "#64748b" }}
          />
          <Line
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
            name="Average Speed"
            type="monotone"
            dataKey="avg"
            stroke="#0ea5e9" // sky-500
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
          <Scatter
            dataKey="avg"
            shape={<CustomArrow />}
            isAnimationActive={false}
          />
        </ComposedChart>
      )}
    </div>
  );
}
