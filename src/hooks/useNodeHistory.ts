import useSWR from "swr";
import { fetchQuery } from "../api/query";
import type { QueryResponse } from "../api/query";
import {
  type ChartTimeSelection,
  selectionCacheKey,
  selectionToQueryParams,
} from "../lib/timeWindow";

export interface HistoryData {
  response: QueryResponse;
  fetchedAt: number;
}

interface UseNodeHistoryResult {
  data: HistoryData | undefined;
  error: Error | undefined;
  isLoading: boolean;
  /** True while SWR is fetching (including background revalidation). */
  isValidating: boolean;
}

/**
 * Fetches historical time-series data for one node and a set of metrics.
 *
 * SWR caches by (nodeId, source, sortedMetrics, selection) key.
 * Revalidates on focus, but does NOT auto-poll (historical data doesn't need
 * 30s refresh — only on page open or window change).
 */
export function useNodeHistory(
  nodeId: string,
  source: "readings" | "telemetry",
  metrics: string[],
  selection: ChartTimeSelection
): UseNodeHistoryResult {
  const sortedMetrics = [...metrics].sort();
  const cacheKey = `node-history:${nodeId}:${source}:${sortedMetrics.join(",")}:${selectionCacheKey(selection)}`;

  const { data, error, isLoading, isValidating } = useSWR<HistoryData>(
    cacheKey,
    async () => {
      const params = selectionToQueryParams(selection);
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
      revalidateOnFocus: true,
      refreshInterval: 0,
    }
  );

  return { data, error, isLoading, isValidating };
}
