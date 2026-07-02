import { Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import type { SensorHealthResult, SensorHealthSeverity } from "../../lib/status";
import { formatSecondsSince } from "../../lib/format";

interface SensorHealthPillProps {
  health: SensorHealthResult;
  nodeId: string;
  nowMs: number;
}

const SEVERITY_STYLES: Record<
  SensorHealthSeverity,
  { text: string; Icon: typeof CheckCircle2 }
> = {
  healthy: { text: "text-green-700", Icon: CheckCircle2 },
  degraded: { text: "text-amber-600", Icon: AlertTriangle },
  unhealthy: { text: "text-red-600", Icon: AlertCircle },
};

export default function SensorHealthPill({
  health,
  nodeId,
  nowMs,
}: SensorHealthPillProps) {
  const { healthy, total, overallSeverity, unhealthyLabels, telemetryAgeSeconds } =
    health;

  if (total === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
        No sensors
      </span>
    );
  }

  const allHealthy = healthy === total;
  const unhealthySummary =
    unhealthyLabels.length > 0 ? unhealthyLabels.join(", ") : undefined;
  const { text, Icon } = SEVERITY_STYLES[overallSeverity];

  const telemetryAgeLabel =
    telemetryAgeSeconds !== null
      ? formatSecondsSince(nowMs, Math.floor(nowMs / 1000) - telemetryAgeSeconds)
      : null;

  const titleLines = [
    allHealthy
      ? `All ${total} monitored sensors healthy`
      : `Issues: ${unhealthySummary}`,
    telemetryAgeLabel
      ? `Telemetry snapshot ${telemetryAgeLabel}`
      : "Telemetry age unknown",
    "Click for full telemetry",
  ];

  return (
    <Link
      to={`/nodes/${nodeId}#sensor-health`}
      onClick={(e) => e.stopPropagation()}
      className={[
        "inline-flex items-center gap-1 text-xs font-medium rounded-md",
        "hover:underline focus-visible:outline-2 focus-visible:outline-green-600",
        text,
      ].join(" ")}
      aria-label={
        allHealthy
          ? `Sensor health: ${healthy} of ${total} healthy. ${titleLines[1]}`
          : `Sensor health: ${healthy} of ${total} healthy. Issues: ${unhealthySummary}. ${titleLines[1]}`
      }
      title={titleLines.join(" · ")}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {healthy}/{total} sensors
        {!allHealthy && unhealthySummary && (
          <span className="font-normal opacity-90"> ({unhealthySummary})</span>
        )}
      </span>
      {telemetryAgeLabel && (
        <span className="font-normal text-slate-400 hidden sm:inline">
          · telem {telemetryAgeLabel}
        </span>
      )}
    </Link>
  );
}
