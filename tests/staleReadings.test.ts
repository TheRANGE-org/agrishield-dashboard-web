import { describe, it, expect } from "vitest";
import { staleSensorLabelsByNode } from "../src/lib/staleReadings";
import type { QueryResponse } from "../src/api/query";

describe("staleSensorLabelsByNode", () => {
  it("flags SPS30 when PM2.5 is flat for 3+ minute buckets", () => {
    const response: QueryResponse = {
      query: {},
      ts_unit: "seconds",
      columns: ["ts", "nodeId", "siteId", "sps30_pm2_5", "scd41_co2_ppm"],
      rows: [
        [1000, "node-01", "wildcat", 4.5, 400],
        [1060, "node-01", "wildcat", 4.5, 401],
        [1120, "node-01", "wildcat", 4.5, 402],
        [1180, "node-01", "wildcat", 4.5, 403],
      ],
    };
    const byNode = staleSensorLabelsByNode(response);
    expect(byNode.get("node-01")?.has("SPS30")).toBe(true);
    expect(byNode.get("node-01")?.has("SCD41")).toBe(false);
  });

  it("does not flag when values are still changing", () => {
    const response: QueryResponse = {
      query: {},
      ts_unit: "seconds",
      columns: ["ts", "nodeId", "siteId", "sps30_pm2_5"],
      rows: [
        [1000, "node-01", "wildcat", 4.5],
        [1060, "node-01", "wildcat", 4.6],
        [1120, "node-01", "wildcat", 4.7],
      ],
    };
    const byNode = staleSensorLabelsByNode(response);
    expect(byNode.has("node-01")).toBe(false);
  });
});
