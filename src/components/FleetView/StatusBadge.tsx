import type { NodeStatus } from "../../lib/status";

interface StatusBadgeProps {
  status: NodeStatus;
}

const CONFIG: Record<
  NodeStatus,
  { dot: string; label: string; ring: string }
> = {
  live: {
    dot: "bg-green-500",
    label: "Live",
    ring: "ring-green-200",
  },
  stale: {
    dot: "bg-amber-400",
    label: "Stale",
    ring: "ring-amber-200",
  },
  dead: {
    dot: "bg-red-500",
    label: "Dead",
    ring: "ring-red-200",
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { dot, label, ring } = CONFIG[status];

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
