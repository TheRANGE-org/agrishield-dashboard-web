import { useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { useFleet } from "../../hooks/useFleet";
import { useFleetStaleMetrics } from "../../hooks/useFleetStaleMetrics";
import { useMetadata } from "../../hooks/useMetadata";
import { useTicker } from "../../hooks/useTicker";
import type { FleetNode } from "../../api/types";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import NodeTile from "./NodeTile";
import FleetMap, { type MapFocus } from "./FleetMap";
import { formatDateTime } from "../../lib/format";
import { filterNodesBySite, uniqueSiteIds } from "../../lib/fleetFilters";

export default function FleetView() {
  const { fleet, isLoading, error, lastUpdated } = useFleet();
  const { catalog, isLoading: catalogLoading } = useMetadata();
  const nowMs = useTicker(1000);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapFocus, setMapFocus] = useState<MapFocus | null>(null);
  const [selectedSite, setSelectedSite] = useState("");
  const [mapExpanded, setMapExpanded] = useState(false);

  const siteIds = useMemo(
    () => uniqueSiteIds(fleet?.nodes ?? []),
    [fleet?.nodes]
  );

  const visibleNodes = useMemo(
    () => filterNodesBySite(fleet?.nodes ?? [], selectedSite),
    [fleet?.nodes, selectedSite]
  );

  const visibleNodeIds = useMemo(
    () => visibleNodes.map((n) => n.nodeId),
    [visibleNodes]
  );
  const { staleByNode } = useFleetStaleMetrics(visibleNodeIds);

  const mapRefitKey = useMemo(
    () =>
      `${selectedSite || "all"}-${mapExpanded ? "expanded" : "compact"}-${visibleNodes
        .map((n) => n.nodeId)
        .join(",")}`,
    [selectedSite, mapExpanded, visibleNodes]
  );

  function handleShowOnMap(node: FleetNode) {
    if (node.latitude === null || node.longitude === null) return;
    setMapFocus({
      nodeId: node.nodeId,
      lat: node.latitude,
      lng: node.longitude,
      at: Date.now(),
    });
    mapContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (isLoading || catalogLoading) {
    return <LoadingState message="Loading fleet status…" />;
  }

  if (error) {
    return (
      <ErrorState
        message="Unable to load fleet data"
        detail={error.message}
      />
    );
  }

  if (!fleet || fleet.nodes.length === 0 || fleet.warning === "no data yet") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-slate-200 border-t-green-600" />
        <p className="text-sm font-medium text-slate-700">
          Waiting for first data
        </p>
        <p className="text-xs text-slate-400 text-center max-w-xs">
          The fleet hasn't reported yet. This page will update automatically
          when sensor data arrives.
        </p>
      </div>
    );
  }

  const liveCount = visibleNodes.filter((n) => n.status === "live").length;
  const staleCount = visibleNodes.filter((n) => n.status === "stale").length;
  const deadCount = visibleNodes.filter((n) => n.status === "dead").length;
  const showSiteFilter = siteIds.length > 1;

  return (
    <div>
      {/* ── Page header ────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Fleet Status</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {selectedSite && (
              <span className="font-medium text-slate-700">{selectedSite} · </span>
            )}
            {visibleNodes.length} node{visibleNodes.length !== 1 ? "s" : ""}
            {showSiteFilter && !selectedSite && (
              <span className="text-slate-400"> across {siteIds.length} sites</span>
            )}
            {" · "}
            <span className="text-green-700 font-medium">{liveCount} live</span>
            {staleCount > 0 && (
              <span className="text-amber-600 font-medium">
                {" "}· {staleCount} stale
              </span>
            )}
            {deadCount > 0 && (
              <span className="text-red-600 font-medium">
                {" "}· {deadCount} offline
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {showSiteFilter && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span className="sr-only">Filter by site</span>
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white py-1.5 pl-2.5 pr-8 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                aria-label="Filter fleet by site"
              >
                <option value="">All sites</option>
                {siteIds.map((site) => (
                  <option key={site} value={site}>
                    {site}
                  </option>
                ))}
              </select>
            </label>
          )}

          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Updated {formatDateTime(lastUpdated)}
            </div>
          )}
        </div>
      </div>

      {/* ── Map toolbar + map ──────────────────────────────────────── */}
      <div ref={mapContainerRef} className="mb-6 space-y-2">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setMapExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            aria-pressed={mapExpanded}
            aria-label={mapExpanded ? "Use compact map height" : "Expand map height"}
          >
            {mapExpanded ? (
              <>
                <Minimize2 className="h-4 w-4" aria-hidden />
                Compact map
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" aria-hidden />
                Expand map
              </>
            )}
          </button>
        </div>

        <FleetMap
          nodes={visibleNodes}
          nowMs={nowMs}
          focus={mapFocus}
          expanded={mapExpanded}
          refitKey={mapRefitKey}
        />
      </div>

      {/* ── Node grid ──────────────────────────────────────────────── */}
      {catalog ? (
        visibleNodes.length > 0 ? (
          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
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
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">
            No nodes match the selected site filter.
          </p>
        )
      ) : (
        <LoadingState message="Loading metric catalog…" />
      )}
    </div>
  );
}
