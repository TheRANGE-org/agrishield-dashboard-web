import type { MetricMetadata } from "../../api/types";
import { formatMetricValue } from "../../lib/format";

interface MetricValueProps {
  value: number | string | boolean | null | undefined;
  metric: MetricMetadata;
  className?: string;
}

/**
 * Renders a single metric value using catalog metadata for formatting.
 * Shows "—" for null/undefined values.
 */
export default function MetricValue({
  value,
  metric,
  className = "",
}: MetricValueProps) {
  const formatted = formatMetricValue(value, metric);
  const isNull = value === null || value === undefined;

  return (
    <span
      className={[isNull ? "text-slate-300" : "", className].join(" ").trim()}
      title={metric.how_to_read}
    >
      {formatted}
    </span>
  );
}
