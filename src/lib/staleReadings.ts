import type { QueryResponse } from "../api/query";

/** Metrics checked for flat-line / stale readings on fleet tiles. */
export const FLEET_STALE_METRICS = [
  { metric: "sps30_pm2_5", sensorLabel: "SPS30", tileLabel: "PM 2.5" },
  { metric: "scd41_co2_ppm", sensorLabel: "SCD41", tileLabel: "CO₂" },
] as const;

/** Consecutive minute buckets with the same value → stale. */
export const STALE_FLAT_BUCKET_COUNT = 3;

/**
 * Returns sensor labels (e.g. "SPS30") whose reading metric has not changed
 * across the last N minute buckets in a columnar query response.
 */
export function staleSensorLabelsFromQuery(
  response: QueryResponse,
  minFlatBuckets = STALE_FLAT_BUCKET_COUNT
): Set<string> {
  const stale = new Set<string>();
  const tsIdx = response.columns.indexOf("ts");
  const nodeIdx = response.columns.indexOf("nodeId");
  if (tsIdx < 0 || nodeIdx < 0) return stale;

  const byNode = new Map<string, (number | string | null)[][]>();
  for (const row of response.rows) {
    const nodeId = String(row[nodeIdx]);
    const bucket = byNode.get(nodeId) ?? [];
    bucket.push(row);
    byNode.set(nodeId, bucket);
  }

  for (const check of FLEET_STALE_METRICS) {
    const metricIdx = response.columns.indexOf(check.metric);
    if (metricIdx < 0) continue;

    for (const [, rows] of byNode) {
      rows.sort((a, b) => Number(a[tsIdx]) - Number(b[tsIdx]));
      const values = rows
        .map((r) => r[metricIdx])
        .filter((v): v is number => typeof v === "number");
      if (values.length < minFlatBuckets) continue;
      const tail = values.slice(-minFlatBuckets);
      if (tail.every((v) => v === tail[0])) {
        stale.add(check.sensorLabel);
      }
    }
  }

  return stale;
}

/**
 * Per-node stale sensor labels from a multi-node columnar query.
 */
export function staleSensorLabelsByNode(
  response: QueryResponse,
  minFlatBuckets = STALE_FLAT_BUCKET_COUNT
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  const tsIdx = response.columns.indexOf("ts");
  const nodeIdx = response.columns.indexOf("nodeId");
  if (tsIdx < 0 || nodeIdx < 0) return result;

  const byNode = new Map<string, (number | string | null)[][]>();
  for (const row of response.rows) {
    const nodeId = String(row[nodeIdx]);
    const bucket = byNode.get(nodeId) ?? [];
    bucket.push(row);
    byNode.set(nodeId, bucket);
  }

  for (const [nodeId, rows] of byNode) {
    rows.sort((a, b) => Number(a[tsIdx]) - Number(b[tsIdx]));
    const nodeStale = new Set<string>();

    for (const check of FLEET_STALE_METRICS) {
      const metricIdx = response.columns.indexOf(check.metric);
      if (metricIdx < 0) continue;
      const values = rows
        .map((r) => r[metricIdx])
        .filter((v): v is number => typeof v === "number");
      if (values.length < minFlatBuckets) continue;
      const tail = values.slice(-minFlatBuckets);
      if (tail.every((v) => v === tail[0])) {
        nodeStale.add(check.sensorLabel);
      }
    }

    if (nodeStale.size > 0) result.set(nodeId, nodeStale);
  }

  return result;
}

export function isSensorLabelStale(
  staleByNode: Map<string, Set<string>> | undefined,
  nodeId: string,
  sensorLabel: string
): boolean {
  return staleByNode?.get(nodeId)?.has(sensorLabel) ?? false;
}
