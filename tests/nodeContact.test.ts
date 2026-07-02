import { describe, it, expect } from "vitest";
import {
  getNodeContactInfo,
  nodeSetupUrl,
  formatContactSummary,
} from "../src/lib/nodeContact";
import type { FleetNode } from "../src/api/types";

function makeNode(overrides: Partial<FleetNode> = {}): FleetNode {
  return {
    nodeId: "agrishield-node-02",
    siteId: "wildcat",
    latitude: 35.0,
    longitude: -101.0,
    status: "live",
    seconds_since_contact: 60,
    registration: { hostname: "agrishield-node-02", uptime_seconds: 3600 },
    latest_reading: { ts: 2000, seconds_since: 60, values: {} },
    latest_telemetry: {
      ts: 1900,
      seconds_since: 160,
      values: { system_health_system_uptime_s: 3600 },
    },
    ...overrides,
  };
}

describe("getNodeContactInfo", () => {
  it("uses max of reading and telemetry for last contact", () => {
    const info = getNodeContactInfo(makeNode(), 2100);
    expect(info.lastContactTs).toBe(2000);
  });

  it("estimates restart from uptime", () => {
    const info = getNodeContactInfo(makeNode(), 5000);
    expect(info.lastRestartTs).toBe(1400);
    expect(info.uptimeSeconds).toBe(3600);
  });
});

describe("nodeSetupUrl", () => {
  it("builds mDNS setup URL from hostname", () => {
    expect(nodeSetupUrl(makeNode())).toBe(
      "https://agrishield-node-02.local:8000/setup"
    );
  });
});

describe("formatContactSummary", () => {
  it("includes human-readable contact and restart strings", () => {
    const info = getNodeContactInfo(makeNode(), 5000);
    const summary = formatContactSummary(info, 5000 * 1000);
    expect(summary.lastContactAgo).toMatch(/ago/);
    expect(summary.lastRestartAgo).toMatch(/ago/);
    expect(summary.uptimeLabel).toBe("1h 0m");
  });
});
