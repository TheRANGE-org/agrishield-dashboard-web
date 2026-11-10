import type { NodeStatus, SensorHealthSeverity } from "./status";

/**
 * Fleet cards encode three independent conditions at once. None of them
 * overwrites the others:
 *
 * - Header band — deployment. Sky blue is Lab. An untinted header is Production.
 * - Card fill — readings. Yellow means a monitored sensor is missing, degraded,
 *   unhealthy, or flat-lined. White means the readings are fully functional.
 * - Left bar and inset frame — contact. No bar is live. Amber is stale.
 *   Red is offline.
 *
 * A lab node that is offline and has bad readings is blue on top, yellow in
 * the body, and red around the edge.
 */
export const FLEET_CARD_COLORS = {
  quietFill: "bg-white",
  readingsFill: "bg-yellow-100",
  labHeader: "bg-sky-200",
  labBadge:
    "bg-sky-400 text-sky-950 ring-1 ring-sky-500",
  staleRail: "bg-amber-500",
  deadRail: "bg-red-500",
  liveBorder: "border-slate-200",
  staleBorder: "border-amber-400",
  deadBorder: "border-red-400",
  staleRing: "ring-2 ring-inset ring-amber-400",
  deadRing: "ring-2 ring-inset ring-red-500",
} as const;

export interface ReadingsAttentionInput {
  sensorTotal: number;
  overallSeverity: SensorHealthSeverity;
  staleSensorCount: number;
}

/** True when a monitored reading is missing, degraded, unhealthy, or flat-lined. */
export function readingsNeedAttention(input: ReadingsAttentionInput): boolean {
  return (
    input.sensorTotal === 0 ||
    input.overallSeverity !== "healthy" ||
    input.staleSensorCount > 0
  );
}

export interface FleetCardSignals {
  labMode: boolean;
  contact: NodeStatus;
  readingsNeedAttention: boolean;
}

export interface FleetCardScheme {
  shellClass: string;
  headerClass: string;
  railClass: string | null;
  stateSummary: string;
}

export function fleetCardScheme(signals: FleetCardSignals): FleetCardScheme {
  const fill = signals.readingsNeedAttention
    ? FLEET_CARD_COLORS.readingsFill
    : FLEET_CARD_COLORS.quietFill;

  const contact =
    signals.contact === "dead"
      ? {
          border: FLEET_CARD_COLORS.deadBorder,
          ring: FLEET_CARD_COLORS.deadRing,
          rail: FLEET_CARD_COLORS.deadRail,
          label: "offline",
        }
      : signals.contact === "stale"
        ? {
            border: FLEET_CARD_COLORS.staleBorder,
            ring: FLEET_CARD_COLORS.staleRing,
            rail: FLEET_CARD_COLORS.staleRail,
            label: "stale contact",
          }
        : {
            border: FLEET_CARD_COLORS.liveBorder,
            ring: "",
            rail: null,
            label: "in contact",
          };

  const deployment = signals.labMode ? "Lab" : "Production";
  const readings = signals.readingsNeedAttention
    ? "readings need attention"
    : "readings ok";

  return {
    shellClass: ["border", fill, contact.border, contact.ring]
      .filter(Boolean)
      .join(" "),
    headerClass: signals.labMode ? FLEET_CARD_COLORS.labHeader : "",
    railClass: contact.rail,
    stateSummary: `${deployment}, ${contact.label}, ${readings}`,
  };
}
