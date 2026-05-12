import { describe, it, expect } from "vitest";
import { formatSecondsSince, formatUptime } from "../src/lib/format";

describe("formatSecondsSince", () => {
  const baseMs = 1_000_000_000 * 1000; // arbitrary base in ms

  it("returns 'just now' for future timestamps", () => {
    const futureTs = baseMs / 1000 + 10;
    expect(formatSecondsSince(baseMs, futureTs)).toBe("just now");
  });

  it("formats seconds ago", () => {
    const ts = baseMs / 1000 - 47;
    expect(formatSecondsSince(baseMs, ts)).toBe("47s ago");
  });

  it("formats minutes ago", () => {
    const ts = baseMs / 1000 - 125;
    expect(formatSecondsSince(baseMs, ts)).toBe("2m ago");
  });

  it("formats hours ago", () => {
    const ts = baseMs / 1000 - 7200;
    expect(formatSecondsSince(baseMs, ts)).toBe("2h ago");
  });

  it("formats days ago", () => {
    const ts = baseMs / 1000 - 172800;
    expect(formatSecondsSince(baseMs, ts)).toBe("2d ago");
  });
});

describe("formatUptime", () => {
  it("formats seconds", () => {
    expect(formatUptime(42)).toBe("42s");
  });

  it("formats minutes and seconds", () => {
    expect(formatUptime(125)).toBe("2m 5s");
  });

  it("formats hours and minutes", () => {
    expect(formatUptime(7320)).toBe("2h 2m");
  });

  it("formats days and hours", () => {
    expect(formatUptime(86400 * 3 + 3600 * 5)).toBe("3d 5h");
  });
});
