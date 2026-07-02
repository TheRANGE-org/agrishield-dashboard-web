import { useState } from "react";
import { useSWRConfig } from "swr";

/** Revalidate fleet, stale-metrics, and node history caches. */
export function useRefreshNodeData(nodeId: string) {
  const { mutate } = useSWRConfig();
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function refresh() {
    setIsRefreshing(true);
    try {
      await mutate(
        (key) =>
          typeof key === "string" &&
          (key === "/api/fleet" ||
            key.startsWith("fleet-stale:") ||
            key.startsWith(`node-history:${nodeId}:`)),
        undefined,
        { revalidate: true }
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  return { refresh, isRefreshing };
}
