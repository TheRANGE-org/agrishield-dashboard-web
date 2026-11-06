import { describe, expect, it } from "vitest";
import { deploymentMode, isLabMode } from "../src/lib/deploymentMode";
import type { FleetNode } from "../src/api/types";

function node(
  telemetryMode?: string,
  readingMode?: string,
): FleetNode {
  return {
    nodeId: "agrishield-node-05",
    siteId: "lab",
    status: "live",
    seconds_since_contact: 10,
    latitude: null,
    longitude: null,
    registration: null,
    latest_reading: readingMode
      ? { ts: 1, seconds_since: 1, values: { deployment_mode: readingMode } }
      : null,
    latest_telemetry: telemetryMode
      ? { ts: 2, seconds_since: 1, values: { deployment_mode: telemetryMode } }
      : null,
  };
}

describe("deploymentMode", () => {
  it("treats a missing mode as lab", () => {
    expect(deploymentMode(node())).toBe("lab");
    expect(isLabMode(node())).toBe(true);
  });

  it("reads lab from telemetry ahead of an older reading", () => {
    expect(isLabMode(node("lab", "production"))).toBe(true);
    expect(isLabMode(node("production", "lab"))).toBe(false);
  });

  it("falls back to the reading when telemetry has no mode", () => {
    expect(isLabMode(node(undefined, "Lab"))).toBe(true);
  });
});
