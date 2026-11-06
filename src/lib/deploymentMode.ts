import type { FleetNode } from "../api/types";

export type DeploymentMode = "lab" | "production";

function modeFromValues(
  values: Record<string, number | string | boolean | null> | undefined,
): DeploymentMode | null {
  const raw = values?.deployment_mode;
  if (typeof raw !== "string") return null;
  const mode = raw.trim().toLowerCase();
  if (mode === "lab" || mode === "production") return mode;
  return null;
}

/** Lab vs production, preferring the latest telemetry report. Unset stays lab. */
export function deploymentMode(node: FleetNode): DeploymentMode {
  return (
    modeFromValues(node.latest_telemetry?.values) ??
    modeFromValues(node.latest_reading?.values) ??
    "lab"
  );
}

export function isLabMode(node: FleetNode): boolean {
  return deploymentMode(node) === "lab";
}
