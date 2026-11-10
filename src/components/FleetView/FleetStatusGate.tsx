import type { ReactNode } from "react";
import type { FleetResponse } from "../../api/types";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";

interface FleetStatusGateProps {
  isLoading: boolean;
  error: Error | undefined;
  fleet: FleetResponse | undefined;
  /** Wrapper for the loading, error, and empty states. The map page centers them. */
  frameClassName?: string;
  children: ReactNode;
}

export default function FleetStatusGate({
  isLoading,
  error,
  fleet,
  frameClassName,
  children,
}: FleetStatusGateProps) {
  if (isLoading) {
    return (
      <div className={frameClassName}>
        <LoadingState message="Loading fleet status…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={frameClassName}>
        <ErrorState message="Unable to load fleet data" detail={error.message} />
      </div>
    );
  }

  if (!fleet || fleet.nodes.length === 0 || fleet.warning === "no data yet") {
    return (
      <div className={frameClassName}>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-slate-200 border-t-green-600" />
          <p className="text-sm font-medium text-slate-700">Waiting for first data</p>
          <p className="text-xs text-slate-400 text-center max-w-xs">
            The fleet hasn't reported yet. This page will update automatically
            when sensor data arrives.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
