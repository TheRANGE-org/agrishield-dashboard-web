import type { NodeOverlayStatus } from "../../api/types";
import { overlayReachability } from "../../lib/status";
import { formatSecondsSince } from "../../lib/format";

interface OverlayStatusBadgeProps {
  overlay: NodeOverlayStatus | null | undefined;
  nowMs: number;
}

const CONFIG = {
  online: {
    dot: "bg-sky-500",
    label: "Online",
    ring: "ring-sky-200",
    bg: "bg-sky-50 text-sky-800",
  },
  offline: {
    dot: "bg-slate-400",
    label: "Offline",
    ring: "ring-slate-200",
    bg: "bg-slate-100 text-slate-600",
  },
  unknown: {
    dot: "bg-slate-300",
    label: "Unknown",
    ring: "ring-slate-200",
    bg: "bg-slate-50 text-slate-500",
  },
} as const;

export default function OverlayStatusBadge({
  overlay,
  nowMs,
}: OverlayStatusBadgeProps) {
  const reachability = overlayReachability(overlay);
  const { dot, label, ring, bg } = CONFIG[reachability];

  const titleParts = ["Tailscale mesh (Headscale control plane)"];
  if (overlay?.tailscale_ip) {
    titleParts.push(overlay.tailscale_ip);
  }
  if (overlay?.last_seen_ts) {
    titleParts.push(
      `last seen ${formatSecondsSince(nowMs, overlay.last_seen_ts)}`
    );
  }
  if (overlay?.polled_at) {
    titleParts.push(`polled ${formatSecondsSince(nowMs, overlay.polled_at)} ago`);
  }

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ring-1",
        ring,
        bg,
      ].join(" ")}
      title={titleParts.join(" · ")}
      aria-label={`Mesh status: ${label}`}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full shrink-0",
          dot,
          reachability === "online" ? "animate-pulse" : "",
        ].join(" ")}
        aria-hidden="true"
      />
      Mesh · {label}
    </span>
  );
}
