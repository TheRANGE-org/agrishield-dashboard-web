import type { Catalog, MetricMetadata } from "../api/types";

/**
 * Returns a metric by name, or null if not found.
 */
export function getMetric(
  catalog: Catalog,
  name: string
): MetricMetadata | null {
  return catalog.metrics[name] ?? null;
}

/**
 * Returns all metrics for a given source (readings | telemetry).
 */
export function getMetricsBySource(
  catalog: Catalog,
  source: "readings" | "telemetry"
): MetricMetadata[] {
  return Object.values(catalog.metrics).filter((m) => m.source === source);
}

/**
 * Returns all metrics by visibility tier.
 */
export function getMetricsByVisibility(
  catalog: Catalog,
  visibility: "primary" | "secondary" | "diagnostic"
): MetricMetadata[] {
  return Object.values(catalog.metrics).filter(
    (m) => m.visibility === visibility
  );
}

/**
 * Returns the paired metric for a given metric name, or null.
 * (e.g. bme688_temperature_c pairs_with scd41_temp_c)
 */
export function getPairedMetric(
  catalog: Catalog,
  name: string
): MetricMetadata | null {
  const metric = catalog.metrics[name];
  if (!metric?.pairs_with) return null;
  return catalog.metrics[metric.pairs_with] ?? null;
}
