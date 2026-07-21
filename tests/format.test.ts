import { describe, it, expect } from "vitest";
import { formatCoordinates, formatSecondsSince, formatUptime } from "../src/lib/format";
import { formatTimeForWindow, degreesToCompassPoint } from "../src/lib/timeWindow";

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

describe("formatCoordinates", () => {
  it("formats lat/lng to 5 decimal places", () => {
    expect(formatCoordinates(35.23604, -101.93901)).toBe(
      "35.23604, -101.93901"
    );
  });

  it("returns null when latitude is missing", () => {
    expect(formatCoordinates(null, -101.93901)).toBeNull();
  });

  it("returns null when longitude is missing", () => {
    expect(formatCoordinates(35.23604, null)).toBeNull();
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

// ─── formatTimeForWindow ──────────────────────────────────────────────────────

describe("formatTimeForWindow", () => {
  // Use a fixed unix timestamp: 2024-01-15 14:32:00 UTC
  // In most test environments TZ=UTC, so HH:MM is straightforward.
  const TS = 1705329120; // 2024-01-15 14:32:00 UTC

  it("returns HH:MM format for 1h window", () => {
    const result = formatTimeForWindow(TS, "1h");
    // Must be two digits colon two digits
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it("returns HH:MM format for 4h window", () => {
    expect(formatTimeForWindow(TS, "4h")).toMatch(/^\d{2}:\d{2}$/);
  });

  it("returns HH:MM format for 24h window", () => {
    expect(formatTimeForWindow(TS, "24h")).toMatch(/^\d{2}:\d{2}$/);
  });

  it("returns month+day format for 7d window", () => {
    // e.g. "Jan 15"
    const result = formatTimeForWindow(TS, "7d");
    expect(result).toMatch(/\w+ \d+/);
    // Should NOT look like HH:MM
    expect(result).not.toMatch(/^\d{2}:\d{2}$/);
  });

  it("returns month+day format for multi-day axis style", () => {
    const result = formatTimeForWindow(TS, "7d");
    expect(result).toMatch(/\w+ \d+/);
  });

  it("produces consistent output for the same ts + window", () => {
    expect(formatTimeForWindow(TS, "24h")).toBe(formatTimeForWindow(TS, "24h"));
  });
});

// ─── degreesToCompassPoint ────────────────────────────────────────────────────

describe("degreesToCompassPoint", () => {
  it("returns N for 0°", () => expect(degreesToCompassPoint(0)).toBe("N"));
  it("returns N for 360°", () => expect(degreesToCompassPoint(360)).toBe("N"));
  it("returns E for 90°", () => expect(degreesToCompassPoint(90)).toBe("E"));
  it("returns S for 180°", () => expect(degreesToCompassPoint(180)).toBe("S"));
  it("returns W for 270°", () => expect(degreesToCompassPoint(270)).toBe("W"));
  it("returns NE for 45°", () => expect(degreesToCompassPoint(45)).toBe("NE"));
  it("returns NNE for 22.5°", () => expect(degreesToCompassPoint(22.5)).toBe("NNE"));
  it("handles negative degrees gracefully", () => {
    // -10° normalizes to 350°, which rounds to 0 (N), not NNW
    // Math.round(350/22.5) = Math.round(15.56) = 16, 16%16 = 0 → N
    expect(degreesToCompassPoint(-10)).toBe("N");
  });
  it("handles degrees > 360", () => {
    expect(degreesToCompassPoint(720)).toBe("N");
  });
});

