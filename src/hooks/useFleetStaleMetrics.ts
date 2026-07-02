import useSWR from "swr";
import { fetchQuery } from "../api/query";
import {
  FLEET_STALE_METRICS,
  staleSensorLabelsByNode,
} from "../lib/staleReadings";

const POLL_INTERVAL_MS = 30_000;

/**
 * Fetches recent minute-bucketed readings for all fleet nodes and detects
 * sensors whose values have not changed across the last few buckets.
 */
export function useFleetStaleMetrics(nodeIds: string[]): {
  staleByNode: Map<string, Set<string>>;
  isLoading: boolean;
} {
  const sortedIds = [...nodeIds].sort();
  const cacheKey =
    sortedIds.length > 0
      ? `fleet-stale:${sortedIds.join(",")}`
      : null;

  const { data, isLoading } = useSWR(
    cacheKey,
    async () => {
      const response = await fetchQuery({
        source: "readings",
        node_ids: sortedIds,
        metrics: FLEET_STALE_METRICS.map((m) => m.metric),
        window: "1h",
        bucket: "1m",
        agg: "last",
      });
      return staleSensorLabelsByNode(response);
    },
    {
      refreshInterval: POLL_INTERVAL_MS,
      revalidateOnFocus: true,
    }
  );

  return {
    staleByNode: data ?? new Map(),
    isLoading,
  };
}
