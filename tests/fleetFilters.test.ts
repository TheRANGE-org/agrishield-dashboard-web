import { describe, it, expect } from "vitest";
import {
  countDeployments,
  filterNodesByDeployment,
  filterNodesBySite,
  fleetSearchParams,
  fleetSelectionEmptyMessage,
  hiddenDeploymentNote,
  parseDeploymentFilter,
  uniqueSiteIds,
  visibleNodePhrase,
} from "../src/lib/fleetFilters";
import type { FleetNode } from "../src/api/types";

function node(
  id: string,
  siteId: string,
  mode?: "lab" | "production"
): FleetNode {
  return {
    nodeId: id,
    siteId,
    status: "live",
    seconds_since_contact: 60,
    latitude: null,
    longitude: null,
    latest_reading: null,
    latest_telemetry: mode
      ? { ts: 1, seconds_since: 1, values: { deployment_mode: mode } }
      : null,
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

describe("parseDeploymentFilter", () => {
  it("defaults a missing or unknown value to production", () => {
    expect(parseDeploymentFilter(null)).toBe("production");
    expect(parseDeploymentFilter(undefined)).toBe("production");
    expect(parseDeploymentFilter("")).toBe("production");
    expect(parseDeploymentFilter("field")).toBe("production");
  });

  it("accepts lab, all, and production regardless of case", () => {
    expect(parseDeploymentFilter("lab")).toBe("lab");
    expect(parseDeploymentFilter("ALL")).toBe("all");
    expect(parseDeploymentFilter(" Production ")).toBe("production");
  });
});

describe("filterNodesByDeployment", () => {
  const nodes = [
    node("field", "wildcat", "production"),
    node("bench", "shop", "lab"),
    node("unset", "shop"),
  ];

  it("keeps production nodes and treats a missing mode as lab", () => {
    expect(filterNodesByDeployment(nodes, "production").map((n) => n.nodeId)).toEqual([
      "field",
    ]);
    expect(filterNodesByDeployment(nodes, "lab").map((n) => n.nodeId)).toEqual([
      "bench",
      "unset",
    ]);
  });

  it("returns every node for all", () => {
    expect(filterNodesByDeployment(nodes, "all")).toHaveLength(3);
  });
});

describe("deployment summary", () => {
  const counts = countDeployments([
    node("field", "wildcat", "production"),
    node("bench", "shop", "lab"),
    node("unset", "shop"),
  ]);

  it("counts unset nodes as lab", () => {
    expect(counts).toEqual({ production: 1, lab: 2 });
  });

  it("names the hidden set", () => {
    expect(hiddenDeploymentNote(counts, "production")).toBe("2 lab nodes not shown");
    expect(hiddenDeploymentNote(counts, "lab")).toBe("1 production node not shown");
    expect(hiddenDeploymentNote(counts, "all")).toBeNull();
    expect(hiddenDeploymentNote({ production: 4, lab: 0 }, "production")).toBeNull();
  });

  it("phrases the visible set", () => {
    expect(visibleNodePhrase(1, "production")).toBe("1 production node");
    expect(visibleNodePhrase(2, "lab")).toBe("2 lab nodes");
    expect(visibleNodePhrase(3, "all")).toBe("3 nodes");
  });

  it("explains an empty selection", () => {
    expect(fleetSelectionEmptyMessage("production", "shop", 0)).toBe(
      "No nodes match the selected site filter."
    );
    expect(fleetSelectionEmptyMessage("production", "", 2)).toBe(
      "No production nodes to show."
    );
    expect(fleetSelectionEmptyMessage("lab", "wildcat", 1)).toBe(
      "No lab nodes to show."
    );
  });
});

describe("fleetSearchParams", () => {
  it("always sets deployment and omits an empty site or node", () => {
    expect(
      fleetSearchParams({ deployment: "production", site: "", node: null }).toString()
    ).toBe("deployment=production");
  });

  it("keeps site and the focused node", () => {
    expect(
      fleetSearchParams({
        deployment: "lab",
        site: "shop",
        node: "agrishield-node-01",
      }).toString()
    ).toBe("deployment=lab&site=shop&node=agrishield-node-01");
  });
});
