import { Loader2 } from "lucide-react";

interface Props {
  active: boolean;
  label?: string;
}

/** Semi-transparent overlay with spinner for in-flight chart queries. */
export default function ChartLoadingOverlay({
  active,
  label = "Loading chart data…",
}: Props) {
  if (!active) return null;

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/70 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <Loader2 className="h-7 w-7 animate-spin text-green-600" aria-hidden />
      <span className="text-xs font-medium text-slate-600">{label}</span>
    </div>
  );
}
