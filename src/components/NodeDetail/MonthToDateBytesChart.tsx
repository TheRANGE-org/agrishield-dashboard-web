import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { DataPoint } from "../../lib/chartData";
import { formatPartialDataNote, hasData, seriesCoverage } from "../../lib/chartData";
import { formatByteVolume } from "../../lib/monthToDate";
import { formatTimeForWindow, formatTooltipTime } from "../../lib/timeWindow";
import { metricColor } from "../../lib/chartConfig";
import { useContainerSize } from "../../hooks/useContainerSize";
import PartialDataNote from "../shared/PartialDataNote";
import { ChartSkeleton, ChartEmpty } from "./MetricChart";

interface Props {
  data: DataPoint[];
  monthLabel: string;
  busy?: boolean;
}

interface TooltipPayloadItem {
  value: number | null;
  payload: DataPoint;
}

function MtdTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  const value = point.value;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-slate-500 mb-1">
        {formatTooltipTime(point.payload.ts, "7d")}
      </p>
      <p className="font-semibold text-slate-800">
        {value === null ? "—" : formatByteVolume(value)} cumulative
      </p>
      <p className="text-slate-400 mt-1 max-w-[220px] leading-relaxed">
        Running total of uploaded reading + telemetry payload bytes this month.
      </p>
    </div>
  );
}

export default function MonthToDateBytesChart({
  data,
  monthLabel,
  busy = false,
}: Props) {
  const { ref, width, height } = useContainerSize();

  if (busy && data.length === 0) {
    return <ChartSkeleton />;
  }

  if (!hasData(data)) {
    return (
      <ChartEmpty
        label="Bytes sent"
        detail="No byte_count data this month yet. Telemetry bytes require firmware that stamps per-line sizes."
      />
    );
  }

  const partialNote = formatPartialDataNote(seriesCoverage(data));
  const color = metricColor("byte_count");
  const chartData = data.map((p) => ({ ts: p.ts, value: p.value }));
  const tickFmt = (ts: number) => formatTimeForWindow(ts, "7d");

  return (
    <div>
      <p className="text-[11px] text-slate-400 px-2 mb-1">
        Month-to-date cumulative upload volume · {monthLabel}
      </p>
      <div ref={ref} style={{ width: "100%", height: 220, minWidth: 0 }}>
        {width > 0 && height > 0 ? (
          <LineChart
            width={width}
            height={height}
            data={chartData}
            margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="ts"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              tickFormatter={tickFmt}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              tickFormatter={(v: number) => formatByteVolume(v)}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<MtdTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={true}
              isAnimationActive={false}
            />
          </LineChart>
        ) : null}
      </div>
      {partialNote && <PartialDataNote note={partialNote} />}
    </div>
  );
}
