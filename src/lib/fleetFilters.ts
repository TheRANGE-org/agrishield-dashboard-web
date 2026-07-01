import type { FleetNode } from "../api/types";

/** Sorted unique site IDs present in the fleet snapshot. */
export function uniqueSiteIds(nodes: FleetNode[]): string[] {
  return [...new Set(nodes.map((n) => n.siteId))].sort((a, b) =>
    a.localeCompare(b)
  );
}

/** Returns all nodes when `siteId` is empty; otherwise filters to one site. */
export function filterNodesBySite(
  nodes: FleetNode[],
  siteId: string
): FleetNode[] {
  if (!siteId) return nodes;
  return nodes.filter((n) => n.siteId === siteId);
}

export const FLEET_MAP_HEIGHT_COMPACT = 280;
export const FLEET_MAP_HEIGHT_EXPANDED = 520;
