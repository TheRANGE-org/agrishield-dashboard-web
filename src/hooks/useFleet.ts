import useSWR from "swr";
import { fetchFleet } from "../api/fleet";
import type { FleetResponse } from "../api/types";

const POLL_INTERVAL_MS = 30_000;

/**
 * Polls /api/fleet every 30s and revalidates on focus (tab switch).
 */
export function useFleet(): {
  fleet: FleetResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  lastUpdated: number | undefined;
} {
  const { data, isLoading, error } = useSWR<FleetResponse>(
    "/api/fleet",
    fetchFleet,
    {
      refreshInterval: POLL_INTERVAL_MS,
      revalidateOnFocus: true,
    }
  );

  return {
    fleet: data,
    isLoading,
    error,
    lastUpdated: data?.generated_at,
  };
}
