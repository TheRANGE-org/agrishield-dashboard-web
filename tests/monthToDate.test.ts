import { describe, expect, it } from "vitest";
import type { DataPoint } from "../src/lib/chartData";
import {
  chunkDateRangeInclusive,
  concatSeriesChunks,
  cumulativeSumSeries,
  formatByteVolume,
  localMonthStartIso,
  mergeSumSeries,
  monthToDateChunks,
} from "../src/lib/monthToDate";

describe("localMonthStartIso", () => {
  it("returns first day of the month", () => {
    expect(localMonthStartIso(new Date(2026, 6, 28))).toBe("2026-07-01");
    expect(localMonthStartIso(new Date(2026, 0, 1))).toBe("2026-01-01");
  });
});

describe("chunkDateRangeInclusive", () => {
  it("returns a single chunk for ranges within the span limit", () => {
    expect(chunkDateRangeInclusive("2026-07-01", "2026-07-10", 14)).toEqual([
      { startDate: "2026-07-01", endDate: "2026-07-10" },
    ]);
  });

  it("splits a 31-day month into 14-day chunks", () => {
    const chunks = chunkDateRangeInclusive("2026-07-01", "2026-07-31", 14);
    expect(chunks).toEqual([
      { startDate: "2026-07-01", endDate: "2026-07-14" },
      { startDate: "2026-07-15", endDate: "2026-07-28" },
      { startDate: "2026-07-29", endDate: "2026-07-31" },
    ]);
  });

  it("returns empty for inverted ranges", () => {
    expect(chunkDateRangeInclusive("2026-07-10", "2026-07-01", 14)).toEqual([]);
  });
});

describe("monthToDateChunks", () => {
  it("chunks from month start through today", () => {
    const chunks = monthToDateChunks(new Date(2026, 6, 20));
    expect(chunks[0].startDate).toBe("2026-07-01");
    expect(chunks[chunks.length - 1].endDate).toBe("2026-07-20");
  });
});

describe("mergeSumSeries", () => {
  it("sums overlapping timestamps", () => {
    const a: DataPoint[] = [
      { ts: 1, value: 10 },
      { ts: 2, value: 20 },
    ];
    const b: DataPoint[] = [
      { ts: 2, value: 5 },
      { ts: 3, value: 7 },
    ];
    expect(mergeSumSeries(a, b)).toEqual([
      { ts: 1, value: 10 },
      { ts: 2, value: 25 },
      { ts: 3, value: 7 },
    ]);
  });

  it("keeps null when both sides are null", () => {
    expect(
      mergeSumSeries([{ ts: 1, value: null }], [{ ts: 1, value: null }])
    ).toEqual([{ ts: 1, value: null }]);
  });
});

describe("cumulativeSumSeries", () => {
  it("accumulates non-null values and holds through gaps", () => {
    const input: DataPoint[] = [
      { ts: 1, value: 100 },
      { ts: 2, value: null },
      { ts: 3, value: 50 },
    ];
    expect(cumulativeSumSeries(input)).toEqual([
      { ts: 1, value: 100 },
      { ts: 2, value: 100 },
      { ts: 3, value: 150 },
    ]);
  });

  it("stays null until the first real value", () => {
    expect(
      cumulativeSumSeries([
        { ts: 1, value: null },
        { ts: 2, value: 10 },
      ])
    ).toEqual([
      { ts: 1, value: null },
      { ts: 2, value: 10 },
    ]);
  });
});

describe("concatSeriesChunks", () => {
  it("merges multiple chunks in time order", () => {
    const result = concatSeriesChunks([
      [
        { ts: 1, value: 1 },
        { ts: 2, value: 2 },
      ],
      [
        { ts: 3, value: 3 },
        { ts: 4, value: 4 },
      ],
    ]);
    expect(result.map((p) => p.ts)).toEqual([1, 2, 3, 4]);
  });
});

describe("formatByteVolume", () => {
  it("picks B / KB / MB / GB thresholds", () => {
    expect(formatByteVolume(42)).toBe("42 B");
    expect(formatByteVolume(1500)).toBe("1.5 KB");
    expect(formatByteVolume(2_500_000)).toBe("2.50 MB");
    expect(formatByteVolume(1_250_000_000)).toBe("1.25 GB");
  });
});
