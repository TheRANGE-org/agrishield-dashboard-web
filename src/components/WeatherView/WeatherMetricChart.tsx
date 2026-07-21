import MetricChart from "../NodeDetail/MetricChart";
import type { MetricMetadata } from "../../api/types";
import type { DataPoint } from "../../lib/chartData";
import type { AxisWindow } from "../../lib/timeWindow";

interface Props {
  metric: MetricMetadata;
  data: DataPoint[];
  window: AxisWindow;
  unit: string;
  convertFn: (val: number) => number;
}

export default function WeatherMetricChart({ metric, data, window, unit, convertFn }: Props) {
  // Clone metric and change unit
  const mappedMetric = { ...metric, unit };
  if (mappedMetric.reference_ranges) {
    mappedMetric.reference_ranges = Object.fromEntries(
      Object.entries(mappedMetric.reference_ranges).map(([k, v]) => [k, convertFn(v)])
    );
  }
  
  // Map data
  const mappedData = data.map(d => ({
    ...d,
    value: typeof d.value === "number" ? convertFn(d.value) : d.value
  }));

  return <MetricChart metric={mappedMetric} data={mappedData} window={window} />;
}
