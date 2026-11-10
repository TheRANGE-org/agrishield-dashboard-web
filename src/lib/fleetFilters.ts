import type { FleetNode } from "../api/types";
import { deploymentMode } from "./deploymentMode";

/** Fleet board filter. Absent or unknown query values stay production. */
export type DeploymentFilter = "production" | "lab" | "all";

export const DEPLOYMENT_FILTERS: readonly DeploymentFilter[] = [
  "production",
  "lab",
  "all",
];

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

/**
 * Production is the wall-board default. `lab` and `all` must be explicit.
 * Any other value, including a missing param, is production.
 */
export function parseDeploymentFilter(
  value: string | null | undefined
): DeploymentFilter {
  const mode = value?.trim().toLowerCase();
  if (mode === "lab" || mode === "all" || mode === "production") return mode;
  return "production";
}

/** Keeps nodes whose deployment matches the filter. Unset mode counts as lab. */
export function filterNodesByDeployment(
  nodes: FleetNode[],
  filter: DeploymentFilter
): FleetNode[] {
  if (filter === "all") return nodes;
  return nodes.filter((node) => deploymentMode(node) === filter);
}

export interface DeploymentCounts {
  production: number;
  lab: number;
}

/** Counts within the current site selection, before the deployment filter. */
export function countDeployments(nodes: FleetNode[]): DeploymentCounts {
  const counts: DeploymentCounts = { production: 0, lab: 0 };
  for (const node of nodes) {
    counts[deploymentMode(node)] += 1;
  }
  return counts;
}

export function visibleNodePhrase(
  count: number,
  filter: DeploymentFilter
): string {
  const noun = count === 1 ? "node" : "nodes";
  if (filter === "production") return `${count} production ${noun}`;
  if (filter === "lab") return `${count} lab ${noun}`;
  return `${count} ${noun}`;
}

/** Nodes the deployment filter is holding off this board. Null when nothing is hidden. */
export function hiddenDeploymentNote(
  counts: DeploymentCounts,
  filter: DeploymentFilter
): string | null {
  if (filter === "production" && counts.lab > 0) {
    const noun = counts.lab === 1 ? "node" : "nodes";
    return `${counts.lab} lab ${noun} not shown`;
  }
  if (filter === "lab" && counts.production > 0) {
    const noun = counts.production === 1 ? "node" : "nodes";
    return `${counts.production} production ${noun} not shown`;
  }
  return null;
}

export function fleetSelectionEmptyMessage(
  filter: DeploymentFilter,
  site: string,
  siteMatchCount: number
): string {
  if (site && siteMatchCount === 0) {
    return "No nodes match the selected site filter.";
  }
  if (filter === "production") return "No production nodes to show.";
  if (filter === "lab") return "No lab nodes to show.";
  return "No nodes match the selected filters.";
}

/** Query string shared by the fleet board and the map. Always sets deployment. */
export function fleetSearchParams(input: {
  deployment: DeploymentFilter;
  site?: string;
  node?: string | null;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set("deployment", input.deployment);
  if (input.site) params.set("site", input.site);
  if (input.node) params.set("node", input.node);
  return params;
}
