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

  // Pre-sort dirData for fast binary search of closest direction
  const sortedDirData = [...dirData].filter(d => typeof d.value === "number").sort((a, b) => a.ts - b.ts);

  const getClosestDirection = (targetTs: number): number | null => {
    if (sortedDirData.length === 0) return null;
    
    // Max allowable time difference (1 hour)
    const MAX_DIFF_MS = 60 * 60 * 1000;

    let closest = sortedDirData[0];
    let minDiff = Math.abs(sortedDirData[0].ts - targetTs);

    for (let i = 1; i < sortedDirData.length; i++) {
      const diff = Math.abs(sortedDirData[i].ts - targetTs);
      if (diff < minDiff) {
        minDiff = diff;
        closest = sortedDirData[i];
      }
      if (sortedDirData[i].ts > targetTs && diff > minDiff) {
        // Since it's sorted, if we passed the target and the diff is growing, we can break early
        break;
      }
    }

    if (minDiff <= MAX_DIFF_MS) {
      return (Number(closest.value) + 180) % 360;
    }
    return null;
  };

  interface CustomComboTickProps {
    x?: string | number;
    y?: string | number;
    payload?: { value: number };
  }

  const CustomComboTick = (props: CustomComboTickProps) => {
    const { x, y, payload } = props;
    if (x === undefined || y === undefined || payload === undefined || payload.value === undefined) return null;
    
    const rotation = getClosestDirection(payload.value);
    
    // Y position is the baseline for the text
    const xPos = Number(x);
    const yPos = Number(y) + 8; // push text down slightly for margin
    
    return (
      <g>
        <text 
          x={xPos} 
          y={yPos} 
          dy={4} 
          textAnchor="middle" 
          fill="#94a3b8" 
          fontSize={10}
        >
          {formatTimeForWindow(payload.value, window)}
        </text>
        
        {rotation !== null && (
          <g transform={`translate(${xPos}, ${yPos + 20})`}>
            <circle cx="0" cy="0" r="10" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
            <g transform={`rotate(${rotation})`}>
              <path 
                d="M0 -6 L0 6 M0 -6 L-3 -2 M0 -6 L3 -2" 
                stroke="#0ea5e9" 
                strokeWidth={2} 
                fill="none" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </g>
          </g>
        )}
      </g>
    );
  };

  return (
    <div ref={ref} className="w-full h-full relative" style={{ aspectRatio: "2 / 1", minHeight: 0, minWidth: 0 }}>
      {width > 0 && height > 0 && (
        <ComposedChart width={width} height={height} data={merged}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="ts"
            type="number"
            domain={["dataMin", "dataMax"]}
            tick={CustomComboTick}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            minTickGap={40}
            height={50} // Make sure there is enough height for both text and arrow!
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
        </ComposedChart>
      )}
    </div>
  );
}
