import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from "recharts";
import type { MetricMetadata } from "../../api/types";
import type { DataPoint } from "../../lib/chartData";
import type { TimeWindow } from "../../lib/timeWindow";
import { formatTimeForWindow, formatTooltipTime } from "../../lib/timeWindow";
import { referenceRangeColor, metricColor } from "../../lib/chartConfig";
import { useContainerSize } from "../../hooks/useContainerSize";

interface Props {
  /** The "avg" metric (solid line, primary). */
  avgMetric: MetricMetadata;
  /** The "peak/min" metric (dashed line, visually subordinate). */
  peakMetric: MetricMetadata;
  avgData: DataPoint[];
  peakData: DataPoint[];
  window: TimeWindow;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  dataKey: string;
  value: number | null;
  payload: { ts: number; avg: number | null; peak: number | null };
  color: string;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number;
  window: TimeWindow;
  avgMetric: MetricMetadata;
  peakMetric: MetricMetadata;
}

function CustomTooltip({
  active,
  payload,
  label,
  window,
  avgMetric,
  peakMetric,
}: CustomTooltipProps) {
  if (!active || !payload?.length || label === undefined) return null;
  const fmt = (v: number | null, m: MetricMetadata) =>
    v === null
      ? "—"
      : `${typeof v === "number" && !Number.isInteger(v) ? v.toFixed(2) : v} ${m.unit ?? ""}`;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="text-slate-500">{formatTooltipTime(label, window)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-semibold" style={{ color: p.color }}>
          {p.name}:{" "}
          {p.dataKey === "avg"
            ? fmt(p.value, avgMetric)
            : fmt(p.value, peakMetric)}
        </p>
      ))}
    </div>
  );
}

// ─── PairedChart ──────────────────────────────────────────────────────────────

export default function PairedChart({
  avgMetric,
  peakMetric,
  avgData,
  peakData,
  window,
}: Props) {
  const { ref, width, height } = useContainerSize();

  // Merge both series on ts
  const tsSet = new Map<number, { avg: number | null; peak: number | null }>();

  for (const p of avgData) {
    tsSet.set(p.ts, { avg: p.value, peak: null });
  }
  for (const p of peakData) {
    const existing = tsSet.get(p.ts);
    if (existing) {
      existing.peak = p.value;
    } else {
      tsSet.set(p.ts, { avg: null, peak: p.value });
    }
  }

  const chartData = Array.from(tsSet.entries())
    .sort(([a], [b]) => a - b)
    .map(([ts, vals]) => ({ ts, ...vals }));

  const avgColor = metricColor(avgMetric.name);
  const peakColor = metricColor(peakMetric.name);

  const referenceLines = avgMetric.reference_ranges
    ? Object.entries(avgMetric.reference_ranges)
    : [];

  const yLabel = avgMetric.unit
    ? `${avgMetric.label} (${avgMetric.unit})`
    : avgMetric.label;

  return (
    <div ref={ref} style={{ width: "100%", height: 220, minWidth: 0 }}>
      {width > 0 && height > 0 ? (
        <LineChart width={width} height={height} data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="ts"
          type="number"
          domain={["dataMin", "dataMax"]}
          scale="time"
          tickFormatter={(ts: number) => formatTimeForWindow(ts, window)}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          label={{
            value: yLabel,
            angle: -90,
            position: "insideLeft",
            offset: 12,
            style: { fontSize: 10, fill: "#94a3b8" },
          }}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          content={
            <CustomTooltip
              window={window}
              avgMetric={avgMetric}
              peakMetric={peakMetric}
            />
          }
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
        />

        {referenceLines.map(([key, val]) => (
          <ReferenceLine
            key={key}
            y={val}
            stroke={referenceRangeColor(key)}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{
              value: key.replace(/_/g, " "),
              position: "right",
              style: { fontSize: 9, fill: referenceRangeColor(key) },
            }}
          />
        ))}

        {/* Avg — solid, primary */}
        <Line
          type="monotone"
          dataKey="avg"
          name={avgMetric.label}
          stroke={avgColor}
          strokeWidth={2}
          dot={{ r: 1.5, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
          connectNulls={true}
        />

        {/* Peak — dashed, subordinate */}
        <Line
          type="monotone"
          dataKey="peak"
          name={peakMetric.label}
          stroke={peakColor}
          strokeWidth={1.5}
          strokeDasharray="5 3"
          dot={{ r: 1.5, strokeWidth: 0 }}
          activeDot={{ r: 3 }}
          connectNulls={true}
          opacity={0.6}
        />
        </LineChart>
      ) : null}
    </div>
  );
}
