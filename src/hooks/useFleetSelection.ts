import { useSearchParams } from "react-router-dom";
import {
  type DeploymentFilter,
  fleetSearchParams,
  parseDeploymentFilter,
} from "../lib/fleetFilters";

/**
 * Site and deployment filters live in the query string so Fleet and Map
 * stay on the same set of nodes, and a wall display can bookmark Production.
 */
export function useFleetSelection() {
  const [params, setParams] = useSearchParams();
  const deployment = parseDeploymentFilter(params.get("deployment"));
  const site = params.get("site") ?? "";
  const focusNodeId = params.get("node");

  function replace(next: {
    deployment: DeploymentFilter;
    site: string;
    node: string | null;
  }) {
    setParams(fleetSearchParams(next), { replace: true });
  }

  return {
    deployment,
    site,
    focusNodeId,
    setDeployment(next: DeploymentFilter) {
      replace({ deployment: next, site, node: null });
    },
    setSite(next: string) {
      replace({ deployment, site: next, node: null });
    },
  };
}
