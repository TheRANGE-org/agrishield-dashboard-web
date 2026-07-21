import { AlertCircle, RefreshCw } from "lucide-react";
import { queryErrorDetail, queryErrorTitle } from "../../lib/apiErrors";

interface Props {
  error: unknown;
  onRetry: () => void;
  isRetrying?: boolean;
}

/** Inline banner for failed /api/query loads with an explicit retry action. */
export default function QueryLoadError({ error, onRetry, isRetrying }: Props) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-3"
      role="alert"
    >
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-950">{queryErrorTitle(error)}</p>
          <p className="text-xs text-amber-800/80 mt-0.5">{queryErrorDetail(error)}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="inline-flex items-center justify-center gap-1.5 shrink-0 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60 transition-colors"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} aria-hidden />
        {isRetrying ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}
