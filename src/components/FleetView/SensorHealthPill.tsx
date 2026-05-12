import { CheckCircle2, AlertCircle } from "lucide-react";

interface SensorHealthPillProps {
  healthy: number;
  total: number;
}

export default function SensorHealthPill({
  healthy,
  total,
}: SensorHealthPillProps) {
  if (total === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
        No sensors
      </span>
    );
  }

  const allHealthy = healthy === total;

  return (
    <span
      className={[
        "inline-flex items-center gap-1 text-xs font-medium",
        allHealthy ? "text-green-700" : "text-amber-600",
      ].join(" ")}
      aria-label={`Sensor health: ${healthy} of ${total} healthy`}
    >
      {allHealthy ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      {healthy}/{total} sensors
    </span>
  );
}
