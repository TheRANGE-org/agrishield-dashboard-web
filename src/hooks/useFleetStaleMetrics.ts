import useSWR from "swr";
import { fetchQuery } from "../api/query";
import { MHZ19E_CO2_PPM } from "../lib/co2Reading";
import {
  FLEET_STALE_METRICS,
  staleSensorLabelsByNode,
} from "../lib/staleReadings";

const POLL_INTERVAL_MS = 30_000;

/**
 * Fetches recent minute-bucketed readings for all fleet nodes and detects
 * sensors whose values have not changed across the last few buckets.
 */
export function useFleetStaleMetrics(
  nodeIds: string[],
  options: { includeMhz?: boolean } = {}
): {
  staleByNode: Map<string, Set<string>>;
  isLoading: boolean;
} {
  const { includeMhz = false } = options;
  const sortedIds = [...nodeIds].sort();
  const metrics = FLEET_STALE_METRICS.filter(
    (metric) => includeMhz || metric.metric !== MHZ19E_CO2_PPM
  ).map((metric) => metric.metric);
  const cacheKey =
    sortedIds.length > 0
      ? `fleet-stale:${sortedIds.join(",")}:${metrics.join(",")}`
      : null;

  const { data, isLoading } = useSWR(
    cacheKey,
    async () => {
      const response = await fetchQuery({
        source: "readings",
        node_ids: sortedIds,
        metrics,
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
