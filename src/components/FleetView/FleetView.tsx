import { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useFleet } from "../../hooks/useFleet";
import { useMetadata } from "../../hooks/useMetadata";
import { useTicker } from "../../hooks/useTicker";
import type { FleetNode } from "../../api/types";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import NodeTile from "./NodeTile";
import FleetMap, { type MapFocus } from "./FleetMap";
import { formatDateTime } from "../../lib/format";

export default function FleetView() {
  const { fleet, isLoading, error, lastUpdated } = useFleet();
  const { catalog, isLoading: catalogLoading } = useMetadata();
  const nowMs = useTicker(1000);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapFocus, setMapFocus] = useState<MapFocus | null>(null);

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

  // Loading state — catalog and fleet both needed
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

  // No-data / empty-fleet state
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

  const liveCount = fleet.nodes.filter((n) => n.status === "live").length;
  const staleCount = fleet.nodes.filter((n) => n.status === "stale").length;
  const deadCount = fleet.nodes.filter((n) => n.status === "dead").length;

  return (
    <div>
      {/* ── Page header ────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Fleet Status</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {fleet.nodes.length} node{fleet.nodes.length !== 1 ? "s" : ""} ·{" "}
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

        {lastUpdated && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Updated {formatDateTime(lastUpdated)}
          </div>
        )}
      </div>

      {/* ── Map ────────────────────────────────────────────────────── */}
      <div ref={mapContainerRef} className="mb-6">
        <FleetMap nodes={fleet.nodes} nowMs={nowMs} focus={mapFocus} />
      </div>

      {/* ── Node grid ──────────────────────────────────────────────── */}
      {catalog ? (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          aria-label="Sensor nodes"
        >
          {fleet.nodes.map((node) => (
            <NodeTile
              key={node.nodeId}
              node={node}
              nowMs={nowMs}
              catalog={catalog}
              onShowOnMap={handleShowOnMap}
            />
          ))}
        </div>
      ) : (
        <LoadingState message="Loading metric catalog…" />
      )}
    </div>
  );
}
