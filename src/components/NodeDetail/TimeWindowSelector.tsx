import type { TimeWindow } from "../../lib/timeWindow";

interface Props {
  value: TimeWindow;
  onChange: (w: TimeWindow) => void;
}

const WINDOWS: { label: string; value: TimeWindow }[] = [
  { label: "1h", value: "1h" },
  { label: "6h", value: "6h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
];

/**
 * Segmented-control chip row for selecting the chart time window.
 * Default is 24h (caller sets initial state).
 */
export default function TimeWindowSelector({ value, onChange }: Props) {
  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden"
      role="group"
      aria-label="Chart time window"
    >
      {WINDOWS.map((w, i) => {
        const active = w.value === value;
        return (
          <button
            key={w.value}
            type="button"
            onClick={() => onChange(w.value)}
            aria-pressed={active}
            aria-label={`Show ${w.label}`}
            id={`time-window-${w.value}`}
            className={[
              "px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1",
              i > 0 ? "border-l border-slate-200" : "",
              active
                ? "bg-green-600 text-white"
                : "text-slate-600 hover:bg-slate-50",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {w.label}
          </button>
        );
      })}
    </div>
  );
}
