import { Battery, BatteryFull, BatteryLow, BatteryMedium } from "lucide-react";
import type { BatteryStatus } from "../../lib/status";
import { batteryStatusColor } from "../../lib/status";

interface BatteryIndicatorProps {
  status: BatteryStatus;
  percentage: number | null;
}

function BatteryIcon({ status }: { status: BatteryStatus }) {
  const cls = "h-4 w-4 shrink-0";
  switch (status) {
    case "good":
      return <BatteryFull className={cls} aria-hidden="true" />;
    case "fair":
      return <BatteryMedium className={cls} aria-hidden="true" />;
    case "low":
      return <BatteryLow className={cls} aria-hidden="true" />;
    default:
      return <Battery className={cls} aria-hidden="true" />;
  }
}

export default function BatteryIndicator({
  status,
  percentage,
}: BatteryIndicatorProps) {
  const colorClass = batteryStatusColor(status);

  return (
    <div
      className={["flex items-center gap-1 text-xs font-medium", colorClass].join(
        " "
      )}
      aria-label={`Battery: ${status}${percentage !== null ? `, ${percentage}%` : ""}`}
    >
      <BatteryIcon status={status} />
      <span>
        {percentage !== null ? `${percentage}%` : status}
      </span>
    </div>
  );
}
