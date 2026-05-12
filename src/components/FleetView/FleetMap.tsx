import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { FleetNode } from "../../api/types";
import { computeStatus } from "../../lib/status";
import { formatSecondsSince } from "../../lib/format";

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
}

/**
 * Fits the map viewport to all node positions on first render only.
 * Subsequent fleet updates do NOT refit — preserves user's zoom/pan (Q3).
 */
function FitBoundsOnce({ nodes }: FitBoundsOnceProps) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;
    const withCoords = nodes.filter(
      (n) => n.latitude !== null && n.longitude !== null
    );
    if (withCoords.length === 0) return;

    const bounds = L.latLngBounds(
      withCoords.map((n) => [n.latitude!, n.longitude!])
    );
    map.fitBounds(bounds, { padding: [40, 40] });
    fitted.current = true;
  }, [map, nodes]);

  return null;
}

// ─── FleetMap ─────────────────────────────────────────────────────────────────

interface FleetMapProps {
  nodes: FleetNode[];
  nowMs: number;
}

export default function FleetMap({ nodes, nowMs }: FleetMapProps) {
  const nodesWithCoords = nodes.filter(
    (n) => n.latitude !== null && n.longitude !== null
  );

  if (nodesWithCoords.length === 0) {
    return (
      <div className="w-full rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-sm text-slate-400 bg-slate-50"
        style={{ height: 240 }}>
        No node coordinates available
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
      className="w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm"
      style={{ height: 280 }}
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

        <FitBoundsOnce nodes={nodesWithCoords} />

        {nodesWithCoords.map((node) => {
          const secondsSince = node.latest_reading
            ? Math.floor(nowMs / 1000 - node.latest_reading.ts)
            : node.seconds_since_contact;
          const status = computeStatus(secondsSince);
          const icon = STATUS_ICON[status] ?? STATUS_ICON.dead;

          return (
            <Marker
              key={node.nodeId}
              position={[node.latitude!, node.longitude!]}
              icon={icon}
            >
              <Popup minWidth={160}>
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-slate-800">{node.nodeId}</p>
                  <p className="text-slate-500 text-xs">{node.siteId}</p>
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
                    {node.latest_reading
                      ? formatSecondsSince(nowMs, node.latest_reading.ts)
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
