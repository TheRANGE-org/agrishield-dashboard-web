import { describe, it, expect } from "vitest";
import { transformQueryResponse, hasData } from "../src/lib/chartData";
import type { QueryResponse } from "../src/api/query";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeResponse(
  extra_columns: string[],
  rows: (number | string | null)[][]
): QueryResponse {
  return {
    query: {},
    ts_unit: "seconds",
    columns: ["ts", "nodeId", "siteId", ...extra_columns],
    rows,
    truncated_at: null,
  };
}

// ─── transformQueryResponse ───────────────────────────────────────────────────

describe("transformQueryResponse", () => {
  it("returns empty map when no metric columns", () => {
    const r = makeResponse([], [[1000, "node-01", "wildcat"]]);
    expect(transformQueryResponse(r)).toEqual({});
  });

  it("extracts a single metric series", () => {
    const r = makeResponse(
      ["bme688_temperature_c"],
      [
        [1000, "node-01", "wildcat", 22.5],
        [1060, "node-01", "wildcat", 22.8],
      ]
    );
    const result = transformQueryResponse(r);
    expect(result["bme688_temperature_c"]).toEqual([
      { ts: 1000, value: 22.5 },
      { ts: 1060, value: 22.8 },
    ]);
  });

  it("extracts two metrics independently", () => {
    const r = makeResponse(
      ["temp_c", "hum_pct"],
      [
        [1000, "node-01", "wildcat", 22.5, 45.1],
        [1060, "node-01", "wildcat", 22.8, 44.9],
      ]
    );
    const result = transformQueryResponse(r);
    expect(result["temp_c"].length).toBe(2);
    expect(result["hum_pct"].length).toBe(2);
    expect(result["hum_pct"][0].value).toBeCloseTo(45.1);
  });

  it("maps null cells to null (gap in line)", () => {
    const r = makeResponse(
      ["ze03_co_ppm"],
      [
        [1000, "node-01", "wildcat", null],
        [1060, "node-01", "wildcat", 0.5],
      ]
    );
    const result = transformQueryResponse(r);
    expect(result["ze03_co_ppm"][0].value).toBeNull();
    expect(result["ze03_co_ppm"][1].value).toBeCloseTo(0.5);
  });

  it("maps non-numeric cells to null", () => {
    const r = makeResponse(
      ["some_metric"],
      [[1000, "node-01", "wildcat", "bad-value"]]
    );
    const result = transformQueryResponse(r);
    expect(result["some_metric"][0].value).toBeNull();
  });

  it("handles empty rows array", () => {
    const r = makeResponse(["temp_c"], []);
    const result = transformQueryResponse(r);
    expect(result["temp_c"]).toEqual([]);
  });

  it("returns empty map when ts column is missing", () => {
    const r: QueryResponse = {
      query: {},
      ts_unit: "seconds",
      columns: ["nodeId", "siteId", "temp_c"],
      rows: [["node-01", "wildcat", 22.5]],
      truncated_at: null,
    };
    expect(transformQueryResponse(r)).toEqual({});
  });
});

// ─── hasData ──────────────────────────────────────────────────────────────────

describe("hasData", () => {
  it("returns false for empty array", () => {
    expect(hasData([])).toBe(false);
  });

  it("returns false for all-null array", () => {
    expect(hasData([{ ts: 1000, value: null }, { ts: 1060, value: null }])).toBe(false);
  });

  it("returns true when at least one value is non-null", () => {
    expect(hasData([{ ts: 1000, value: null }, { ts: 1060, value: 5.2 }])).toBe(true);
  });
});
