import { describe, expect, it } from "vitest";
import {
  bucketForDateRange,
  inclusiveDaySpan,
  rangeToUnixBounds,
  validateDateRange,
} from "../src/lib/timeWindow";

describe("inclusiveDaySpan", () => {
  it("counts inclusive calendar days", () => {
    expect(inclusiveDaySpan("2026-05-01", "2026-05-01")).toBe(1);
    expect(inclusiveDaySpan("2026-05-01", "2026-05-14")).toBe(14);
    expect(inclusiveDaySpan("2026-05-01", "2026-05-15")).toBe(15);
  });
});

describe("validateDateRange", () => {
  const now = new Date(2026, 6, 21); // local Jul 21, 2026

  it("accepts a 14-day inclusive range", () => {
    expect(validateDateRange("2026-05-01", "2026-05-14", now).ok).toBe(true);
  });

  it("rejects a 15-day inclusive range", () => {
    const r = validateDateRange("2026-05-01", "2026-05-15", now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/14 days/);
  });

  it("rejects end before start", () => {
    const r = validateDateRange("2026-05-10", "2026-05-01", now);
    expect(r.ok).toBe(false);
  });

  it("rejects future end dates", () => {
    const r = validateDateRange("2026-07-20", "2026-07-22", now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/future/);
  });
});

describe("bucketForDateRange", () => {
  it("uses 15m for short ranges", () => {
    expect(bucketForDateRange("2026-05-01", "2026-05-02")).toBe("15m");
  });

  it("uses 1h for longer ranges", () => {
    expect(bucketForDateRange("2026-05-01", "2026-05-14")).toBe("1h");
  });
});

describe("rangeToUnixBounds", () => {
  it("spans local midnight through end of end date", () => {
    const { start_ts, end_ts } = rangeToUnixBounds("2026-05-01", "2026-05-01");
    expect(end_ts).toBeGreaterThan(start_ts);
    // ~24h minus 1ms
    expect(end_ts - start_ts).toBeGreaterThan(86000);
    expect(end_ts - start_ts).toBeLessThan(86400);
  });
});
