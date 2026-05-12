import { apiFetch } from "./client";
import type { FleetResponse } from "./types";

export function fetchFleet(): Promise<FleetResponse> {
  return apiFetch<FleetResponse>("/api/fleet");
}
