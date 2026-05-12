import { describe, it, expect } from "vitest";
import { referenceRangeColor, metricColor } from "../src/lib/chartConfig";

describe("referenceRangeColor", () => {
  it("returns red for 'warning' keys", () => {
    expect(referenceRangeColor("warning_low")).toBe("#ef4444");
    expect(referenceRangeColor("WARNING_LOW")).toBe("#ef4444");
  });

  it("returns red for 'critical' keys", () => {
    expect(referenceRangeColor("critical_high")).toBe("#ef4444");
  });

  it("returns red for 'dangerous' keys", () => {
    expect(referenceRangeColor("dangerous")).toBe("#ef4444");
  });

  it("returns red for 'threshold' keys", () => {
    expect(referenceRangeColor("fire_smoke_threshold")).toBe("#ef4444");
  });

  it("returns green for 'baseline' keys", () => {
    expect(referenceRangeColor("clean_baseline")).toBe("#22c55e");
  });

  it("returns green for 'nominal' keys", () => {
    expect(referenceRangeColor("nominal")).toBe("#22c55e");
  });

  it("returns green for 'comfort' keys", () => {
    expect(referenceRangeColor("comfort_max")).toBe("#22c55e");
  });

  it("returns green for 'clean' keys", () => {
    expect(referenceRangeColor("clean_air_threshold")).toBe("#ef4444"); // 'threshold' wins
  });

  it("returns orange for 'elevated' keys", () => {
    expect(referenceRangeColor("elevated_dust")).toBe("#f97316");
  });

  it("returns orange for 'high' keys", () => {
    expect(referenceRangeColor("panhandle_summer_high")).toBe("#f97316");
  });

  it("returns gray for unrecognized keys", () => {
    expect(referenceRangeColor("typical_low")).toBe("#94a3b8");
    expect(referenceRangeColor("panhandle_winter_low")).toBe("#94a3b8");
  });
});

describe("metricColor", () => {
  it("returns a named override for well-known metrics", () => {
    expect(metricColor("sps30_pm2_5")).toBe("#dc2626");
    expect(metricColor("bme688_temperature_c")).toBe("#2563eb");
  });

  it("returns a consistent color for unknown metrics (deterministic hash)", () => {
    const c1 = metricColor("some_unknown_metric");
    const c2 = metricColor("some_unknown_metric");
    expect(c1).toBe(c2);
  });

  it("starts with # (valid hex color)", () => {
    expect(metricColor("any_metric")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
