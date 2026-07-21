import useSWR from "swr";
import { fetchQuery } from "../api/query";
import type { QueryResponse } from "../api/query";
import { isTransientApiError } from "../lib/apiErrors";
import {
  type ChartTimeSelection,
  selectionCacheKey,
  selectionQueryTimeoutMs,
  selectionToQueryParams,
} from "../lib/timeWindow";

export interface HistoryData {
  response: QueryResponse;
  fetchedAt: number;
}

interface UseNodeHistoryOptions {
  /** When false, skip the fetch (SWR key is null). Default true. */
  enabled?: boolean;
}

interface UseNodeHistoryResult {
  data: HistoryData | undefined;
  error: Error | undefined;
  isLoading: boolean;
  /** True while SWR is fetching (including background revalidation). */
  isValidating: boolean;
  /** Re-run this query (e.g. after a transient API failure). */
  retry: () => Promise<HistoryData | undefined>;
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
  selection: ChartTimeSelection,
  options: UseNodeHistoryOptions = {}
): UseNodeHistoryResult {
  const { enabled = true } = options;
  const sortedMetrics = [...metrics].sort();
  const active = enabled && !!nodeId && metrics.length > 0;
  const cacheKey = active
    ? `node-history:${nodeId}:${source}:${sortedMetrics.join(",")}:${selectionCacheKey(selection)}`
    : null;

  const timeoutMs = selectionQueryTimeoutMs(selection);

  const { data, error, isLoading, isValidating, mutate } = useSWR<HistoryData>(
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
      const response = await fetchQuery(query, { timeoutMs });
      return { response, fetchedAt: Date.now() };
    },
    {
      revalidateOnFocus: true,
      refreshInterval: 0,
      shouldRetryOnError: (err: unknown) => isTransientApiError(err),
      errorRetryCount: 3,
      errorRetryInterval: 2000,
    }
  );

  return {
    data,
    error,
    isLoading: active && isLoading,
    isValidating: active && isValidating,
    retry: () => mutate(),
  };
}
