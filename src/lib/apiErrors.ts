import { ApiError } from "../api/client";

/**
 * Transient failures where retry is appropriate (overload, proxy 503,
 * browser "CORS" mask on failed responses, timeouts).
 */
export function isTransientApiError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  if (err.status === 503 || err.status === 502 || err.status === 504 || err.status === 429) {
    return true;
  }
  // Status 0: timeout, network blip, or browser masking a non-CORS 503
  if (err.status === 0) return true;
  return false;
}

export function queryErrorTitle(err: unknown): string {
  if (isTransientApiError(err)) {
    return "API is busy loading historical data";
  }
  return "Unable to load chart data";
}

export function queryErrorDetail(err: unknown): string {
  if (isTransientApiError(err)) {
    return "Deep history pulls from cold storage and can briefly overload the API. Wait a moment and retry.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "An unexpected error occurred.";
}
