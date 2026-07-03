import type { NodeStatus } from "../../lib/status";

interface StatusBadgeProps {
  status: NodeStatus;
  /** When set, prefixes the label (e.g. "Data · Live"). */
  channel?: "data";
}

const STATUS_LABEL: Record<NodeStatus, string> = {
  live: "Live",
  stale: "Stale",
  dead: "Dead",
};

const CONFIG: Record<
  NodeStatus,
  { dot: string; ring: string }
> = {
  live: {
    dot: "bg-green-500",
    ring: "ring-green-200",
  },
  stale: {
    dot: "bg-amber-400",
    ring: "ring-amber-200",
  },
  dead: {
    dot: "bg-red-500",
    ring: "ring-red-200",
  },
};

export default function StatusBadge({ status, channel }: StatusBadgeProps) {
  const { dot, ring } = CONFIG[status];
  const baseLabel = STATUS_LABEL[status];
  const label = channel === "data" ? `Data · ${baseLabel}` : baseLabel;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
        "ring-1",
        ring,
        status === "live"
          ? "bg-green-50 text-green-700"
          : status === "stale"
            ? "bg-amber-50 text-amber-700"
            : "bg-red-50 text-red-700",
      ].join(" ")}
      aria-label={`Node status: ${label}`}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full shrink-0",
          dot,
          status === "live" ? "animate-pulse" : "",
        ].join(" ")}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
