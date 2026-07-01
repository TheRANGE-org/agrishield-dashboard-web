import {
  canGoToOlderHistoricalPeriod,
  formatHistoricalPeriodLabel,
  type TimeWindow,
} from "../../lib/timeWindow";

interface Props {
  window: TimeWindow;
  historicalPeriod: number | null;
  onPrevious: () => void;
  onNext: () => void;
}

/**
 * 30-day increment navigator for data older than the rolling 30d preset.
 * Shown when the user is on the 30d preset or has stepped into historical mode.
 */
export default function HistoricalPeriodNav({
  window,
  historicalPeriod,
  onPrevious,
  onNext,
}: Props) {
  if (window !== "30d" && historicalPeriod === null) {
    return null;
  }

  const label =
    historicalPeriod === null
      ? "Last 30 days"
      : formatHistoricalPeriodLabel(historicalPeriod);

  const canPrevious = canGoToOlderHistoricalPeriod(historicalPeriod);
  const canNext = historicalPeriod !== null;

  return (
    <div
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm"
      aria-label="Historical period navigation"
    >
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canPrevious}
        className="rounded px-2 py-0.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
        aria-label="Previous 30 days"
      >
        ◀ Previous 30d
      </button>
      <span className="min-w-[10rem] text-center font-medium text-slate-700 tabular-nums">
        {label}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="rounded px-2 py-0.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
        aria-label="Next 30 days toward present"
      >
        Next 30d ▶
      </button>
    </div>
  );
}
