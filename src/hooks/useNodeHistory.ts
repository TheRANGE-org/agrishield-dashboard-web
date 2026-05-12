import useSWR from "swr";
import { fetchQuery } from "../api/query";
import type { QueryResponse } from "../api/query";
import type { TimeWindow } from "../lib/timeWindow";
import { windowToQueryParams } from "../lib/timeWindow";

export interface HistoryData {
  response: QueryResponse;
  fetchedAt: number;
}

interface UseNodeHistoryResult {
  data: HistoryData | undefined;
  error: Error | undefined;
  isLoading: boolean;
}

/**
 * Fetches historical time-series data for one node and a set of metrics.
 *
 * SWR caches by (nodeId, source, sortedMetrics, window) key.
 * Revalidates on focus, but does NOT auto-poll (historical data doesn't need
 * 30s refresh — only on page open or window change).
 *
 * Uses the columnar JSON response path (agg≠raw).
 */
export function useNodeHistory(
  nodeId: string,
  source: "readings" | "telemetry",
  metrics: string[],
  window: TimeWindow
): UseNodeHistoryResult {
  // Stable SWR key: sort metrics to avoid cache misses on reorder
  const sortedMetrics = [...metrics].sort();
  const cacheKey = `node-history:${nodeId}:${source}:${sortedMetrics.join(",")}:${window}`;

  const { data, error, isLoading } = useSWR<HistoryData>(
    cacheKey,
    async () => {
      const params = windowToQueryParams(window);
      const query = {
        source,
        node_ids: [nodeId],
        metrics,
        agg: params.agg,
        ...(params.window ? { window: params.window } : {}),
        ...(params.start_ts !== undefined ? { start_ts: params.start_ts } : {}),
        ...(params.end_ts !== undefined ? { end_ts: params.end_ts } : {}),
        ...(params.bucket ? { bucket: params.bucket } : {}),
      };
      const response = await fetchQuery(query);
      return { response, fetchedAt: Date.now() };
    },
    {
      // No auto-refresh for historical charts — refresh on focus only
      revalidateOnFocus: true,
      refreshInterval: 0,
    }
  );

  return { data, error, isLoading };
}
