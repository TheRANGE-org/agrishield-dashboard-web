import { apiFetch } from "./client";
import type { DiagnosticsResponse } from "./types";

export function fetchDiagnostics(): Promise<DiagnosticsResponse> {
  return apiFetch<DiagnosticsResponse>("/api/diagnostics");
}
