import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { FleetNode } from "../../api/types";
import { computeStatus } from "../../lib/status";
import { formatCoordinates, formatSecondsSince } from "../../lib/format";

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
  /** Changes when the user picks a different node, so flyTo runs again. */
  at: string;
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
  /** When this changes, bounds are refit (site filter or deployment filter). */
  refitKey: string;
  /** A focused node owns the camera until the user changes the filter. */
  suspended?: boolean;
}

/**
 * Fits the map viewport to node positions on first render and when refitKey changes.
 * Does not refit on every poll — only when the visible node set meaningfully changes.
 */
function FitBoundsOnce({ nodes, refitKey, suspended = false }: FitBoundsOnceProps) {
  const map = useMap();
  const lastRefitKey = useRef<string | null>(null);

  useEffect(() => {
    if (suspended) return;
    if (lastRefitKey.current === refitKey) return;
    const withCoords = nodes.filter(
      (n) => n.latitude !== null && n.longitude !== null
    );
    if (withCoords.length === 0) return;

    const bounds = L.latLngBounds(
      withCoords.map((n) => [n.latitude!, n.longitude!])
    );
    map.fitBounds(bounds, { padding: [48, 48] });
    lastRefitKey.current = refitKey;
  }, [map, nodes, refitKey, suspended]);

  return null;
}

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const invalidate = () => map.invalidateSize();
    const timer = window.setTimeout(invalidate, 150);
    const observer = new ResizeObserver(() => invalidate());
    observer.observe(container);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [map]);

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
  const nodeId = focus?.nodeId;
  const lat = focus?.lat;
  const lng = focus?.lng;
  const at = focus?.at;

  useEffect(() => {
    if (!nodeId || lat === undefined || lng === undefined) return;

    map.flyTo([lat, lng], 15, { duration: 0.8 });

    const openPopup = () => {
      markerRefs.current[nodeId]?.openPopup();
    };
    // Open after flyTo completes so the popup is centered in view.
    map.once("moveend", openPopup);
    return () => {
      map.off("moveend", openPopup);
    };
  }, [map, nodeId, lat, lng, at, markerRefs]);

  return null;
}

// ─── FleetMap ─────────────────────────────────────────────────────────────────

interface FleetMapProps {
  nodes: FleetNode[];
  nowMs: number;
  focus?: MapFocus | null;
  refitKey?: string;
  scrollWheelZoom?: boolean;
}

export default function FleetMap({
  nodes,
  nowMs,
  focus = null,
  refitKey = "default",
  scrollWheelZoom = false,
}: FleetMapProps) {
  const markerRefs = useRef<Record<string, L.Marker>>({});
  const nodesWithCoords = nodes.filter(
    (n) => n.latitude !== null && n.longitude !== null
  );

  if (nodesWithCoords.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
        No node coordinates available for this selection
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
      className="h-full w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm"
      aria-label="Sensor node map"
    >
      <MapContainer
        center={defaultCenter}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={scrollWheelZoom}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <FitBoundsOnce
          nodes={nodesWithCoords}
          refitKey={refitKey}
          suspended={focus !== null}
        />
        <MapResizeHandler />
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
