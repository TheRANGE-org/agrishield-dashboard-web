import { useMemo } from "react";
import { useFleet } from "./useFleet";
import { useFleetSelection } from "./useFleetSelection";
import {
  countDeployments,
  filterNodesByDeployment,
  filterNodesBySite,
  uniqueSiteIds,
} from "../lib/fleetFilters";

/** Fleet snapshot plus the site and deployment selection shared with the map. */
export function useFleetBoard() {
  const fleetState = useFleet();
  const selection = useFleetSelection();
  const nodes = useMemo(
    () => fleetState.fleet?.nodes ?? [],
    [fleetState.fleet]
  );

  const siteIds = useMemo(() => uniqueSiteIds(nodes), [nodes]);
  const siteNodes = useMemo(
    () => filterNodesBySite(nodes, selection.site),
    [nodes, selection.site]
  );
  const visibleNodes = useMemo(
    () => filterNodesByDeployment(siteNodes, selection.deployment),
    [siteNodes, selection.deployment]
  );
  const deploymentCounts = useMemo(
    () => countDeployments(siteNodes),
    [siteNodes]
  );

  return {
    ...fleetState,
    ...selection,
    siteIds,
    siteNodes,
    visibleNodes,
    deploymentCounts,
  };
}
