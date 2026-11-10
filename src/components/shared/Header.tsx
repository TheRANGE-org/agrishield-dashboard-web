import { Link, useLocation, useSearchParams } from "react-router-dom";
import { fleetSearchParams, parseDeploymentFilter } from "../../lib/fleetFilters";

function navClass(active: boolean): string {
  return [
    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
    active
      ? "bg-slate-100 text-slate-900"
      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50",
  ].join(" ");
}

export default function Header() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const isMap = pathname === "/map";
  const deployment = parseDeploymentFilter(params.get("deployment"));
  const site = params.get("site") ?? "";
  const focusNodeId = params.get("node");
  const fleetSearch = fleetSearchParams({
    deployment,
    site,
    node: null,
  }).toString();
  const mapSearch = fleetSearchParams({
    deployment,
    site,
    node: focusNodeId,
  }).toString();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div
        className={[
          "h-14 flex items-center gap-4",
          isMap
            ? "w-full px-4 sm:px-6 lg:px-8"
            : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
        ].join(" ")}
      >
        {/* Brand */}
        <Link
          to={{ pathname: "/", search: fleetSearch }}
          className="flex items-center gap-2.5 shrink-0"
        >
          {/* Shield icon */}
          <svg
            width="26"
            height="26"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M16 2 L28 7 L28 16 C28 23 22 29 16 31 C10 29 4 23 4 16 L4 7 Z"
              fill="#16a34a"
              opacity="0.12"
            />
            <path
              d="M16 2 L28 7 L28 16 C28 23 22 29 16 31 C10 29 4 23 4 16 L4 7 Z"
              fill="none"
              stroke="#16a34a"
              strokeWidth="1.75"
            />
            <circle cx="16" cy="17" r="2" fill="#16a34a" />
            <path
              d="M11 14 Q13 11 16 11 Q19 11 21 14"
              stroke="#16a34a"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M8 11 Q11 7 16 7 Q21 7 24 11"
              stroke="#16a34a"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              opacity="0.45"
            />
          </svg>
          <div>
            <span className="font-semibold text-slate-900 text-sm leading-tight block">
              AgriShield
            </span>
            <span className="text-xs text-slate-400 leading-tight block">
              Sensor Dashboard
            </span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1 ml-4">
          <Link
            to={{ pathname: "/", search: fleetSearch }}
            className={navClass(pathname === "/")}
          >
            Fleet
          </Link>
          <Link
            to={{ pathname: "/map", search: mapSearch }}
            className={navClass(pathname === "/map")}
          >
            Map
          </Link>
          <Link to="/compare" className={navClass(pathname === "/compare")}>
            Compare
          </Link>
          <Link to="/weather" className={navClass(pathname === "/weather")}>
            Weather
          </Link>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Foundation tag */}
        <span className="hidden sm:block text-xs text-slate-400 font-medium">
          TheRANGE Foundation
        </span>
      </div>
    </header>
  );
}
