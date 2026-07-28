import useSWR from "swr";
import { fetchQuery } from "../api/query";
import type { DataPoint } from "../lib/chartData";
import { transformQueryResponse } from "../lib/chartData";
import { isTransientApiError } from "../lib/apiErrors";
import {
  concatSeriesChunks,
  cumulativeSumSeries,
  mergeSumSeries,
  monthToDateChunks,
  monthToDateSpanDays,
} from "../lib/monthToDate";
import { rangeToUnixBounds } from "../lib/timeWindow";

export interface MonthToDateBytesData {
  series: DataPoint[];
  fetchedAt: number;
  monthLabel: string;
}

interface UseMonthToDateBytesOptions {
  enabled?: boolean;
}

interface UseMonthToDateBytesResult {
  data: MonthToDateBytesData | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isValidating: boolean;
  retry: () => Promise<MonthToDateBytesData | undefined>;
}

const MTD_TIMEOUT_MS = 90_000;

async function fetchSourceChunks(
  nodeId: string,
  source: "readings" | "telemetry",
  chunks: { startDate: string; endDate: string }[]
): Promise<DataPoint[]> {
  const seriesChunks = await Promise.all(
    chunks.map(async (chunk) => {
      const { start_ts, end_ts } = rangeToUnixBounds(
        chunk.startDate,
        chunk.endDate
      );
      const response = await fetchQuery(
        {
          source,
          node_ids: [nodeId],
          metrics: ["byte_count"],
          start_ts,
          end_ts,
          bucket: "1h",
          agg: "sum",
        },
        { timeoutMs: MTD_TIMEOUT_MS }
      );
      const map = transformQueryResponse(response);
      return map["byte_count"] ?? [];
    })
  );
  return concatSeriesChunks(seriesChunks);
}

/**
 * Month-to-date cumulative bytes sent (readings + telemetry byte_count sums).
 * Independent of the page chart time-window selector. Chunks absolute ranges
 * to stay within the API's 14-day span limit.
 */
export function useMonthToDateBytes(
  nodeId: string,
  options: UseMonthToDateBytesOptions = {}
): UseMonthToDateBytesResult {
  const { enabled = true } = options;
  const now = new Date();
  const spanDays = monthToDateSpanDays(now);
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const active = enabled && !!nodeId;
  const cacheKey = active ? `mtd-bytes:${nodeId}:${monthKey}:${spanDays}` : null;

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<MonthToDateBytesData>(
      cacheKey,
      async () => {
        const chunks = monthToDateChunks(now);
        const [readings, telemetry] = await Promise.all([
          fetchSourceChunks(nodeId, "readings", chunks),
          fetchSourceChunks(nodeId, "telemetry", chunks),
        ]);
        const merged = mergeSumSeries(readings, telemetry);
        const series = cumulativeSumSeries(merged);
        const monthLabel = new Intl.DateTimeFormat(undefined, {
          month: "long",
          year: "numeric",
        }).format(now);
        return { series, fetchedAt: Date.now(), monthLabel };
      },
      {
        revalidateOnFocus: true,
        refreshInterval: 0,
        shouldRetryOnError: (err: unknown) => isTransientApiError(err),
        errorRetryCount: 2,
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
