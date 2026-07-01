import { AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { decodePiThrottledState } from "../../lib/status";

interface ConditionalBadgesProps {
  throttledState: string | null | undefined;
  pendingBatches: number | null | undefined;
  tailscaleDown: boolean;
  wifiPoor: boolean;
  wifiSignalDbm: number | null | undefined;
}

export default function ConditionalBadges({
  throttledState,
  pendingBatches,
  tailscaleDown,
  wifiPoor,
  wifiSignalDbm,
}: ConditionalBadgesProps) {
  const badges: React.ReactNode[] = [];
  const throttle = decodePiThrottledState(throttledState);

  if (!throttle.isHealthy) {
    const isCritical = throttle.severity === "critical";
    badges.push(
      <span
        key="throttle"
        className={[
          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ring-1",
          isCritical
            ? "bg-red-50 text-red-700 ring-red-200"
            : "bg-amber-50 text-amber-800 ring-amber-200",
        ].join(" ")}
        title={`${throttle.summary} (raw: ${throttle.raw})`}
      >
        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
        {isCritical ? "Power/thermal" : "Past power/thermal"}: {throttle.shortLabel}
      </span>
    );
  }

  if (typeof pendingBatches === "number" && pendingBatches > 0) {
    badges.push(
      <span
        key="batches"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200"
        title="Envelopes queued locally on the Pi, not yet sent to the edge"
      >
        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
        {pendingBatches} pending
      </span>
    );
  }

  if (tailscaleDown) {
    badges.push(
      <span
        key="tailscale"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200"
        title="Tailscale VPN is not running"
      >
        <WifiOff className="h-3 w-3 shrink-0" aria-hidden="true" />
        VPN down
      </span>
    );
  }

  if (wifiPoor && !tailscaleDown) {
    const label =
      typeof wifiSignalDbm === "number" ? `${wifiSignalDbm} dBm` : "poor";
    badges.push(
      <span
        key="wifi"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200"
        title={`WiFi signal is weak (${label})`}
      >
        <Wifi className="h-3 w-3 shrink-0" aria-hidden="true" />
        Weak WiFi
      </span>
    );
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2" aria-label="Degradation warnings">
      {badges}
    </div>
  );
}
