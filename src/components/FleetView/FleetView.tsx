import { useNavigate } from "react-router-dom";
import { useFleetBoard } from "../../hooks/useFleetBoard";
import { useFleetStaleMetrics } from "../../hooks/useFleetStaleMetrics";
import { useMetadata } from "../../hooks/useMetadata";
import { useTicker } from "../../hooks/useTicker";
import type { FleetNode } from "../../api/types";
import LoadingState from "../shared/LoadingState";
import FleetBoardHeader from "./FleetBoardHeader";
import FleetCardKey from "./FleetCardKey";
import FleetStatusGate from "./FleetStatusGate";
import NodeTile from "./NodeTile";
import { fleetSearchParams, fleetSelectionEmptyMessage } from "../../lib/fleetFilters";
import { MHZ19E_CO2_PPM } from "../../lib/co2Reading";

export default function FleetView() {
  const navigate = useNavigate();
  const nowMs = useTicker(1000);
  const { catalog, isLoading: catalogLoading } = useMetadata();
  const {
    fleet,
    isLoading,
    error,
    lastUpdated,
    deployment,
    site,
    siteIds,
    siteNodes,
    visibleNodes,
    deploymentCounts,
    setDeployment,
    setSite,
  } = useFleetBoard();

  const visibleNodeIds = visibleNodes.map((n) => n.nodeId);
  const { staleByNode } = useFleetStaleMetrics(visibleNodeIds, {
    includeMhz: !!catalog?.metrics[MHZ19E_CO2_PPM],
  });

  function handleShowOnMap(node: FleetNode) {
    navigate({
      pathname: "/map",
      search: fleetSearchParams({
        deployment,
        site,
        node: node.nodeId,
      }).toString(),
    });
  }

  if (catalogLoading) {
    return <LoadingState message="Loading fleet status…" />;
  }

  return (
    <FleetStatusGate isLoading={isLoading} error={error} fleet={fleet}>
      <div>
        <FleetBoardHeader
          title="Fleet Status"
          site={site}
          siteIds={siteIds}
          deployment={deployment}
          visibleNodes={visibleNodes}
          deploymentCounts={deploymentCounts}
          lastUpdated={lastUpdated}
          onSiteChange={setSite}
          onDeploymentChange={setDeployment}
        />

        {catalog ? (
          visibleNodes.length > 0 ? (
            <>
              <FleetCardKey />
              <div
                className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 items-start"
                aria-label="Sensor nodes"
              >
                {visibleNodes.map((node) => (
                  <NodeTile
                    key={node.nodeId}
                    node={node}
                    nowMs={nowMs}
                    catalog={catalog}
                    onShowOnMap={handleShowOnMap}
                    staleByNode={staleByNode}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">
              {fleetSelectionEmptyMessage(deployment, site, siteNodes.length)}
            </p>
          )
        ) : (
          <LoadingState message="Loading metric catalog…" />
        )}
      </div>
    </FleetStatusGate>
  );
}
