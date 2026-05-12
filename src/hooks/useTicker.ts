import { useState, useEffect } from "react";

/**
 * Returns the current timestamp (ms), updated on the given interval.
 * Used by fleet tiles to tick "seconds since contact" counters in real-time
 * without triggering network re-fetches.
 */
export function useTicker(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
