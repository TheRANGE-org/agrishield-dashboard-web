import useSWR from "swr";
import { fetchMetadata } from "../api/metadata";
import type { Catalog } from "../api/types";

/**
 * Loads the metric catalog once per session.
 * dedupingInterval = Infinity means it never re-fetches during the session
 * (catalog doesn't change at runtime; a full reload picks up changes).
 */
export function useMetadata(): {
  catalog: Catalog | undefined;
  isLoading: boolean;
  error: Error | undefined;
} {
  const { data, isLoading, error } = useSWR<Catalog>(
    "/api/metadata",
    fetchMetadata,
    {
      dedupingInterval: Infinity,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return { catalog: data, isLoading, error };
}
