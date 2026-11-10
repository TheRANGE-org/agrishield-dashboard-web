import { RefreshCw } from "lucide-react";
import type { FleetNode } from "../../api/types";
import { formatDateTime } from "../../lib/format";
import {
  type DeploymentCounts,
  type DeploymentFilter,
  DEPLOYMENT_FILTERS,
  hiddenDeploymentNote,
  visibleNodePhrase,
} from "../../lib/fleetFilters";

const DEPLOYMENT_LABEL: Record<DeploymentFilter, string> = {
  production: "Production",
  lab: "Lab",
  all: "All",
};

interface FleetBoardHeaderProps {
  title: string;
  site: string;
  siteIds: string[];
  deployment: DeploymentFilter;
  visibleNodes: FleetNode[];
  deploymentCounts: DeploymentCounts;
  lastUpdated: number | undefined;
  onSiteChange: (site: string) => void;
  onDeploymentChange: (deployment: DeploymentFilter) => void;
  className?: string;
}

export default function FleetBoardHeader({
  title,
  site,
  siteIds,
  deployment,
  visibleNodes,
  deploymentCounts,
  lastUpdated,
  onSiteChange,
  onDeploymentChange,
  className,
}: FleetBoardHeaderProps) {
  const liveCount = visibleNodes.filter((n) => n.status === "live").length;
  const staleCount = visibleNodes.filter((n) => n.status === "stale").length;
  const deadCount = visibleNodes.filter((n) => n.status === "dead").length;
  const showSiteFilter = siteIds.length > 1;
  const visibleSiteCount = new Set(visibleNodes.map((n) => n.siteId)).size;
  const hiddenNote = hiddenDeploymentNote(deploymentCounts, deployment);

  return (
    <div
      className={[
        "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",
        className ?? "mb-4",
      ].join(" ")}
    >
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {site && (
            <span className="font-medium text-slate-700">{site} · </span>
          )}
          {visibleNodePhrase(visibleNodes.length, deployment)}
          {deployment === "all" && (
            <span>
              {" · "}
              {deploymentCounts.production} production
              {" · "}
              {deploymentCounts.lab} lab
            </span>
          )}
          {showSiteFilter && !site && visibleSiteCount > 1 && (
            <span className="text-slate-400">
              {" "}
              across {visibleSiteCount} sites
            </span>
          )}
          {hiddenNote && <span> · {hiddenNote}</span>}
          {" · "}
          <span className="text-green-700 font-medium">{liveCount} live</span>
          {staleCount > 0 && (
            <span className="text-amber-600 font-medium">
              {" "}
              · {staleCount} stale
            </span>
          )}
          {deadCount > 0 && (
            <span className="text-red-600 font-medium">
              {" "}
              · {deadCount} offline
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <div
          role="radiogroup"
          aria-label="Filter by deployment"
          className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5"
        >
          {DEPLOYMENT_FILTERS.map((value) => {
            const selected = deployment === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onDeploymentChange(value)}
                className={[
                  "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
                  selected
                    ? value === "lab"
                      ? "bg-sky-200 text-sky-950 shadow-sm"
                      : "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900",
                ].join(" ")}
              >
                {DEPLOYMENT_LABEL[value]}
              </button>
            );
          })}
        </div>

        {showSiteFilter && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="sr-only">Filter by site</span>
            <select
              value={site}
              onChange={(e) => onSiteChange(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white py-1.5 pl-2.5 pr-8 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              aria-label="Filter fleet by site"
            >
              <option value="">All sites</option>
              {siteIds.map((siteId) => (
                <option key={siteId} value={siteId}>
                  {siteId}
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
  );
}
