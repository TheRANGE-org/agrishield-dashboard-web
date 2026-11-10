import { useMemo } from "react";
import { useFleetBoard } from "../../hooks/useFleetBoard";
import { useTicker } from "../../hooks/useTicker";
import FleetBoardHeader from "./FleetBoardHeader";
import FleetMap, { type MapFocus } from "./FleetMap";
import FleetStatusGate from "./FleetStatusGate";
import { fleetSelectionEmptyMessage } from "../../lib/fleetFilters";

const MAP_FRAME = "flex flex-1 items-center justify-center p-6";

export default function MapView() {
  const nowMs = useTicker(1000);
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
    focusNodeId,
    setDeployment,
    setSite,
  } = useFleetBoard();

  const focus = useMemo<MapFocus | null>(() => {
    if (!focusNodeId) return null;
    const node = visibleNodes.find((n) => n.nodeId === focusNodeId);
    if (!node || node.latitude === null || node.longitude === null) return null;
    return {
      nodeId: node.nodeId,
      lat: node.latitude,
      lng: node.longitude,
      at: node.nodeId,
    };
  }, [focusNodeId, visibleNodes]);

  const refitKey = `${deployment}|${site}|${visibleNodes
    .map((n) => n.nodeId)
    .join(",")}`;

  return (
    <FleetStatusGate
      isLoading={isLoading}
      error={error}
      fleet={fleet}
      frameClassName={MAP_FRAME}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-4 pt-4 sm:px-6 lg:px-8">
          <FleetBoardHeader
            title="Fleet Map"
            site={site}
            siteIds={siteIds}
            deployment={deployment}
            visibleNodes={visibleNodes}
            deploymentCounts={deploymentCounts}
            lastUpdated={lastUpdated}
            onSiteChange={setSite}
            onDeploymentChange={setDeployment}
            className="mb-3"
          />
        </div>

        <div className="min-h-0 flex-1 px-4 pb-4 sm:px-6 lg:px-8">
          {visibleNodes.length > 0 ? (
            <FleetMap
              nodes={visibleNodes}
              nowMs={nowMs}
              focus={focus}
              refitKey={refitKey}
              scrollWheelZoom
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              {fleetSelectionEmptyMessage(deployment, site, siteNodes.length)}
            </div>
          )}
        </div>
      </div>
    </FleetStatusGate>
  );
}
