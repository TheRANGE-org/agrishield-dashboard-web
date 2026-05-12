import useSWR from "swr";
import { fetchDiagnostics } from "../api/diagnostics";
import type { DiagnosticsResponse } from "../api/types";

const POLL_INTERVAL_MS = 30_000;

/**
 * Polls /api/diagnostics every 30s. Only used by the DiagnosticsView.
 */
export function useDiagnostics(): {
  diagnostics: DiagnosticsResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
} {
  const { data, isLoading, error } = useSWR<DiagnosticsResponse>(
    "/api/diagnostics",
    fetchDiagnostics,
    {
      refreshInterval: POLL_INTERVAL_MS,
      revalidateOnFocus: true,
    }
  );

  return { diagnostics: data, isLoading, error };
}
