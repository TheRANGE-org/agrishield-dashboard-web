import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import type { MetricMetadata } from "../../api/types";
import type { DataPoint } from "../../lib/chartData";
import type { TimeWindow } from "../../lib/timeWindow";
import { formatTimeForWindow, formatTooltipTime } from "../../lib/timeWindow";
import { referenceRangeColor, metricColor } from "../../lib/chartConfig";

interface Props {
  metric: MetricMetadata;
  data: DataPoint[];
  window: TimeWindow;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  value: number | null;
  payload: DataPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  window: TimeWindow;
  metric: MetricMetadata;
}

function CustomTooltip({ active, payload, window, metric }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  const ts = point.payload.ts;
  const value = point.value;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-slate-500 mb-1">{formatTooltipTime(ts, window)}</p>
      <p className="font-semibold text-slate-800">
        {value === null ? "—" : `${typeof value === "number" && !Number.isInteger(value) ? value.toFixed(2) : value} ${metric.unit ?? ""}`}
      </p>
      {metric.how_to_read && (
        <p className="text-slate-400 mt-1 max-w-[200px] leading-relaxed">
          {metric.how_to_read.slice(0, 100)}
          {metric.how_to_read.length > 100 ? "…" : ""}
        </p>
      )}
    </div>
  );
}

// ─── Tick formatter ───────────────────────────────────────────────────────────

function makeTickFormatter(window: TimeWindow) {
  return (ts: number) => formatTimeForWindow(ts, window);
}

// ─── Chart skeleton ───────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="w-full" style={{ aspectRatio: "2 / 1" }}>
      <div className="w-full h-full rounded-lg bg-slate-100 animate-pulse" />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function ChartEmpty({ label }: { label: string }) {
  return (
    <div
      className="w-full flex items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400"
      style={{ aspectRatio: "2 / 1" }}
    >
      No {label} data in this window
    </div>
  );
}

// ─── MetricChart ──────────────────────────────────────────────────────────────

export { ChartSkeleton, ChartEmpty };

export default function MetricChart({ metric, data, window }: Props) {
  if (data.length === 0) {
    return <ChartEmpty label={metric.label} />;
  }

  const color = metricColor(metric.name);
  const referenceLines = metric.reference_ranges
    ? Object.entries(metric.reference_ranges)
    : [];

  // Recharts needs consistent key; use "value" as the data key
  const chartData = data.map((p) => ({ ts: p.ts, value: p.value }));

  const yLabel = metric.unit
    ? `${metric.label} (${metric.unit})`
    : metric.label;

  return (
    <div style={{ width: "100%", height: 220, minWidth: 0 }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="ts"
          type="number"
          domain={["dataMin", "dataMax"]}
          scale="time"
          tickFormatter={makeTickFormatter(window)}
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
              metric={metric}
            />
          }
        />

        {/* Reference lines from catalog */}
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

        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}
