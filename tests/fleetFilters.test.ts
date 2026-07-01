import { describe, it, expect } from "vitest";
import { filterNodesBySite, uniqueSiteIds } from "../src/lib/fleetFilters";
import type { FleetNode } from "../src/api/types";

function node(id: string, siteId: string): FleetNode {
  return {
    nodeId: id,
    siteId,
    status: "live",
    seconds_since_contact: 60,
    latitude: null,
    longitude: null,
    latest_reading: null,
    latest_telemetry: null,
    registration: null,
  };
}

describe("uniqueSiteIds", () => {
  it("returns sorted unique sites", () => {
    const sites = uniqueSiteIds([
      node("a", "wildcat"),
      node("b", "lab"),
      node("c", "wildcat"),
    ]);
    expect(sites).toEqual(["lab", "wildcat"]);
  });
});

describe("filterNodesBySite", () => {
  const nodes = [
    node("n1", "wildcat"),
    node("n2", "lab"),
    node("n3", "wildcat"),
  ];

  it("returns all nodes when siteId is empty", () => {
    expect(filterNodesBySite(nodes, "")).toHaveLength(3);
  });

  it("filters to one site", () => {
    expect(filterNodesBySite(nodes, "lab").map((n) => n.nodeId)).toEqual(["n2"]);
  });
});
