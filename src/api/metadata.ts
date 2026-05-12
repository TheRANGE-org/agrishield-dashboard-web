import { apiFetch } from "./client";
import type { Catalog } from "./types";

export function fetchMetadata(): Promise<Catalog> {
  return apiFetch<Catalog>("/api/metadata");
}
