import type { Catalog } from "../../api/types";
import { formatMetricValue } from "../../lib/format";

interface Props {
  catalog: Catalog;
  values: Record<string, number | string | boolean | null>;
  source: "readings" | "telemetry";
}

/**
 * Flat key-value table of all available telemetry or reading values.
 * Operator-facing: utilitarian styling, two-column grid.
 */
export default function TelemetryPanel({ catalog, values, source }: Props) {
  // Collect all catalog metrics for this source that have a value
  const entries = Object.entries(catalog.metrics)
    .filter(([ name, m]) => m.source === source && values[name] !== undefined)
    .map(([name, m]) => ({
      name,
      label: m.label,
      formatted: formatMetricValue(values[name], m),
    }));

  if (entries.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic">No {source} values available.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
      {entries.map(({ name, label, formatted }) => (
        <div
          key={name}
          className="flex items-baseline justify-between py-1 border-b border-slate-100 last:border-0"
        >
          <span className="text-xs text-slate-500 truncate mr-2 shrink-0 max-w-[60%]">
            {label}
          </span>
          <span className="text-xs font-medium text-slate-800 tabular-nums text-right">
            {formatted}
          </span>
        </div>
      ))}
    </div>
  );
}
