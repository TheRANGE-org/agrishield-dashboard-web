import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { FleetNode } from "../../api/types";
import { computeStatus } from "../../lib/status";
import { formatCoordinates, formatSecondsSince } from "../../lib/format";
import {
  FLEET_MAP_HEIGHT_COMPACT,
  FLEET_MAP_HEIGHT_EXPANDED,
} from "../../lib/fleetFilters";

export const FLEET_MAP_HEIGHTS = {
  compact: FLEET_MAP_HEIGHT_COMPACT,
  expanded: FLEET_MAP_HEIGHT_EXPANDED,
} as const;

function nodeSecondsSinceContact(node: FleetNode, nowMs: number): number {
  const lastContactTs = Math.max(
    node.latest_reading?.ts ?? 0,
    node.latest_telemetry?.ts ?? 0
  );
  if (lastContactTs > 0) {
    return Math.floor(nowMs / 1000 - lastContactTs);
  }
  return node.seconds_since_contact ?? Number.MAX_SAFE_INTEGER;
}

function nodeLastContactTs(node: FleetNode): number {
  return Math.max(node.latest_reading?.ts ?? 0, node.latest_telemetry?.ts ?? 0);
}

export interface MapFocus {
  nodeId: string;
  lat: number;
  lng: number;
  /** Changes on each focus request so repeat clicks re-trigger flyTo. */
  at: number;
}

// Leaflet default marker icon path fix for bundlers
// (Leaflet's default icon asset URLs break under Vite's asset hashing)
import "leaflet/dist/leaflet.css";

// ─── Status-colored circle markers ───────────────────────────────────────────

function makeCircleIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${color};border:2px solid white;
      box-shadow:0 1px 3px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

const STATUS_ICON: Record<string, L.DivIcon> = {
  live: makeCircleIcon("#16a34a"),  // green-600
  stale: makeCircleIcon("#d97706"), // amber-600
  dead: makeCircleIcon("#dc2626"),  // red-600
};

// ─── Auto-fit bounds helper ───────────────────────────────────────────────────

interface FitBoundsOnceProps {
  nodes: FleetNode[];
  /** When this changes, bounds are refit (e.g. site filter or map expand). */
  refitKey: string;
}

/**
 * Fits the map viewport to node positions on first render and when refitKey changes.
 * Does not refit on every poll — only when the visible node set meaningfully changes.
 */
function FitBoundsOnce({ nodes, refitKey }: FitBoundsOnceProps) {
  const map = useMap();
  const lastRefitKey = useRef<string | null>(null);

  useEffect(() => {
    if (lastRefitKey.current === refitKey) return;
    const withCoords = nodes.filter(
      (n) => n.latitude !== null && n.longitude !== null
    );
    if (withCoords.length === 0) return;

    const bounds = L.latLngBounds(
      withCoords.map((n) => [n.latitude!, n.longitude!])
    );
    map.fitBounds(bounds, { padding: [40, 40] });
    lastRefitKey.current = refitKey;
  }, [map, nodes, refitKey]);

  return null;
}

function MapResizeHandler({ height }: { height: number }) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 150);
    return () => window.clearTimeout(timer);
  }, [map, height]);

  return null;
}

// ─── Fly-to focused node ──────────────────────────────────────────────────────

interface FlyToFocusProps {
  focus: MapFocus | null;
  markerRefs: React.MutableRefObject<Record<string, L.Marker>>;
}

/**
 * Flies the map to a user-selected node and opens its marker popup.
 * Intentional user navigation — does not interfere with FitBoundsOnce.
 */
function FlyToFocus({ focus, markerRefs }: FlyToFocusProps) {
  const map = useMap();

  useEffect(() => {
    if (!focus) return;

    map.flyTo([focus.lat, focus.lng], 15, { duration: 0.8 });

    const openPopup = () => {
      markerRefs.current[focus.nodeId]?.openPopup();
    };
    // Open after flyTo completes so the popup is centered in view.
    map.once("moveend", openPopup);
    return () => {
      map.off("moveend", openPopup);
    };
  }, [map, focus, markerRefs]);

  return null;
}

// ─── FleetMap ─────────────────────────────────────────────────────────────────

interface FleetMapProps {
  nodes: FleetNode[];
  nowMs: number;
  focus?: MapFocus | null;
  expanded?: boolean;
  refitKey?: string;
}

export default function FleetMap({
  nodes,
  nowMs,
  focus = null,
  expanded = false,
  refitKey = "default",
}: FleetMapProps) {
  const markerRefs = useRef<Record<string, L.Marker>>({});
  const mapHeight = expanded
    ? FLEET_MAP_HEIGHT_EXPANDED
    : FLEET_MAP_HEIGHT_COMPACT;
  const nodesWithCoords = nodes.filter(
    (n) => n.latitude !== null && n.longitude !== null
  );

  if (nodesWithCoords.length === 0) {
    return (
      <div
        className="w-full rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-sm text-slate-400 bg-slate-50"
        style={{ height: mapHeight }}
      >
        No node coordinates available
        {nodes.length > 0 && " for this site"}
      </div>
    );
  }

  // Default center — first node as fallback; FitBoundsOnce overrides it
  const defaultCenter: [number, number] = [
    nodesWithCoords[0].latitude!,
    nodesWithCoords[0].longitude!,
  ];

  return (
    <div
      className="w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm transition-[height] duration-300 ease-in-out"
      style={{ height: mapHeight }}
      aria-label="Sensor node map"
    >
      <MapContainer
        center={defaultCenter}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <FitBoundsOnce nodes={nodesWithCoords} refitKey={refitKey} />
        <MapResizeHandler height={mapHeight} />
        <FlyToFocus focus={focus} markerRefs={markerRefs} />

        {nodesWithCoords.map((node) => {
          const coordsLabel = formatCoordinates(node.latitude, node.longitude);
          const secondsSince = nodeSecondsSinceContact(node, nowMs);
          const status = computeStatus(secondsSince);
          const lastContactTs = nodeLastContactTs(node);
          const icon = STATUS_ICON[status] ?? STATUS_ICON.dead;

          return (
            <Marker
              key={node.nodeId}
              ref={(ref) => {
                if (ref) markerRefs.current[node.nodeId] = ref;
              }}
              position={[node.latitude!, node.longitude!]}
              icon={icon}
            >
              <Popup minWidth={160}>
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-slate-800">{node.nodeId}</p>
                  <p className="text-slate-500 text-xs">{node.siteId}</p>
                  {coordsLabel && (
                    <p className="text-slate-500 text-xs tabular-nums">{coordsLabel}</p>
                  )}
                  <p className="text-xs">
                    <span
                      className={
                        status === "live"
                          ? "text-green-700"
                          : status === "stale"
                          ? "text-amber-600"
                          : "text-red-600"
                      }
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                    {" · "}
                    {lastContactTs > 0
                      ? formatSecondsSince(nowMs, lastContactTs)
                      : "no contact"}
                  </p>
                  {/* React-Router Link inside Leaflet popup */}
                  <Link
                    to={`/nodes/${node.nodeId}`}
                    className="inline-block mt-1 text-xs font-medium text-green-700 hover:text-green-800 underline"
                  >
                    View details →
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
