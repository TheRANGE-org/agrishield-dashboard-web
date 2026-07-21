import { useEffect, useState } from "react";
import type { ChartTimeSelection, TimeWindow } from "../../lib/timeWindow";
import {
  localTodayIso,
  MAX_QUERY_SPAN_DAYS,
  validateDateRange,
} from "../../lib/timeWindow";

interface Props {
  value: ChartTimeSelection;
  onChange: (selection: ChartTimeSelection) => void;
}

const PRESETS: { label: string; value: TimeWindow }[] = [
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
];

function defaultCustomRange(): { startDate: string; endDate: string } {
  const end = localTodayIso();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (MAX_QUERY_SPAN_DAYS - 1));
  const y = startDate.getFullYear();
  const m = String(startDate.getMonth() + 1).padStart(2, "0");
  const d = String(startDate.getDate()).padStart(2, "0");
  return { startDate: `${y}-${m}-${d}`, endDate: end };
}

/**
 * Preset chips + optional custom calendar date range (max 14 inclusive days).
 */
export default function ChartTimeControls({ value, onChange }: Props) {
  const isCustom = value.kind === "range";
  const [draftStart, setDraftStart] = useState(
    value.kind === "range" ? value.startDate : defaultCustomRange().startDate
  );
  const [draftEnd, setDraftEnd] = useState(
    value.kind === "range" ? value.endDate : defaultCustomRange().endDate
  );

  useEffect(() => {
    if (value.kind === "range") {
      setDraftStart(value.startDate);
      setDraftEnd(value.endDate);
    }
  }, [value]);

  const validation = validateDateRange(draftStart, draftEnd);
  const today = localTodayIso();
  const draftDirty =
    value.kind !== "range" ||
    value.startDate !== draftStart ||
    value.endDate !== draftEnd;

  function selectPreset(window: TimeWindow) {
    onChange({ kind: "preset", window });
  }

  function openCustom() {
    if (value.kind === "range") return;
    const defaults = defaultCustomRange();
    setDraftStart(defaults.startDate);
    setDraftEnd(defaults.endDate);
    onChange({ kind: "range", ...defaults });
  }

  function applyCustom() {
    if (!validation.ok) return;
    onChange({ kind: "range", startDate: draftStart, endDate: draftEnd });
  }

  return (
    <div className="flex flex-col items-stretch sm:items-end gap-2">
      <div
        className="inline-flex rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden"
        role="group"
        aria-label="Chart time window"
      >
        {PRESETS.map((w, i) => {
          const active = value.kind === "preset" && value.window === w.value;
          return (
            <button
              key={w.value}
              type="button"
              onClick={() => selectPreset(w.value)}
              aria-pressed={active}
              aria-label={`Show ${w.label}`}
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
        <button
          type="button"
          onClick={openCustom}
          aria-pressed={isCustom}
          aria-label="Custom date range"
          className={[
            "px-3 py-1.5 text-sm font-medium transition-colors border-l border-slate-200 focus-visible:outline-2 focus-visible:outline-offset-1",
            isCustom
              ? "bg-green-600 text-white"
              : "text-slate-600 hover:bg-slate-50",
          ].join(" ")}
        >
          Custom
        </button>
      </div>

      {isCustom && (
        <div className="flex flex-col sm:flex-row sm:items-end gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <label className="flex flex-col gap-0.5 text-xs text-slate-500">
            From
            <input
              type="date"
              value={draftStart}
              max={draftEnd < today ? draftEnd : today}
              onChange={(e) => setDraftStart(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-800"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-xs text-slate-500">
            To
            <input
              type="date"
              value={draftEnd}
              min={draftStart}
              max={today}
              onChange={(e) => setDraftEnd(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-800"
            />
          </label>
          <button
            type="button"
            onClick={applyCustom}
            disabled={!validation.ok || !draftDirty}
            className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply
          </button>
          {!validation.ok && (
            <p className="text-xs text-amber-700 sm:max-w-[14rem] sm:self-center">
              {validation.message}
            </p>
          )}
          {validation.ok && (
            <p className="text-[11px] text-slate-400 sm:self-center">
              Max {MAX_QUERY_SPAN_DAYS} days
            </p>
          )}
        </div>
      )}
    </div>
  );
}
