import { describe, expect, it } from "vitest";
import {
  FLEET_CARD_COLORS,
  fleetCardScheme,
  readingsNeedAttention,
} from "../src/lib/fleetCardScheme";

describe("readingsNeedAttention", () => {
  it("stays quiet when every monitored sensor is healthy", () => {
    expect(
      readingsNeedAttention({
        sensorTotal: 3,
        overallSeverity: "healthy",
        staleSensorCount: 0,
      }),
    ).toBe(false);
  });

  it("flags a missing, degraded, unhealthy, or flat-lined reading", () => {
    expect(
      readingsNeedAttention({
        sensorTotal: 0,
        overallSeverity: "healthy",
        staleSensorCount: 0,
      }),
    ).toBe(true);
    expect(
      readingsNeedAttention({
        sensorTotal: 2,
        overallSeverity: "degraded",
        staleSensorCount: 0,
      }),
    ).toBe(true);
    expect(
      readingsNeedAttention({
        sensorTotal: 2,
        overallSeverity: "unhealthy",
        staleSensorCount: 0,
      }),
    ).toBe(true);
    expect(
      readingsNeedAttention({
        sensorTotal: 2,
        overallSeverity: "healthy",
        staleSensorCount: 1,
      }),
    ).toBe(true);
  });
});

describe("fleetCardScheme", () => {
  const quiet = {
    labMode: false,
    contact: "live" as const,
    readingsNeedAttention: false,
  };

  it("leaves a healthy production node white, with no lab band and no contact bar", () => {
    const scheme = fleetCardScheme(quiet);
    expect(scheme.shellClass).toContain(FLEET_CARD_COLORS.quietFill);
    expect(scheme.shellClass).toContain(FLEET_CARD_COLORS.liveBorder);
    expect(scheme.shellClass).not.toContain("ring-");
    expect(scheme.headerClass).toBe("");
    expect(scheme.railClass).toBeNull();
    expect(scheme.stateSummary).toBe("Production, in contact, readings ok");
  });

  it("paints only the header for a healthy lab node", () => {
    const scheme = fleetCardScheme({ ...quiet, labMode: true });
    expect(scheme.shellClass).toContain(FLEET_CARD_COLORS.quietFill);
    expect(scheme.headerClass).toBe(FLEET_CARD_COLORS.labHeader);
    expect(scheme.railClass).toBeNull();
    expect(scheme.stateSummary).toBe("Lab, in contact, readings ok");
  });

  it("paints only the fill when readings need attention", () => {
    const scheme = fleetCardScheme({ ...quiet, readingsNeedAttention: true });
    expect(scheme.shellClass).toContain(FLEET_CARD_COLORS.readingsFill);
    expect(scheme.shellClass).not.toContain(FLEET_CARD_COLORS.quietFill);
    expect(scheme.headerClass).toBe("");
    expect(scheme.railClass).toBeNull();
    expect(scheme.stateSummary).toBe(
      "Production, in contact, readings need attention",
    );
  });

  it("frames stale contact in amber without taking over the fill", () => {
    const scheme = fleetCardScheme({ ...quiet, contact: "stale" });
    expect(scheme.shellClass).toContain(FLEET_CARD_COLORS.quietFill);
    expect(scheme.shellClass).toContain(FLEET_CARD_COLORS.staleBorder);
    expect(scheme.shellClass).toContain(FLEET_CARD_COLORS.staleRing);
    expect(scheme.railClass).toBe(FLEET_CARD_COLORS.staleRail);
  });

  it("shows lab, bad readings, and offline contact together", () => {
    const scheme = fleetCardScheme({
      labMode: true,
      contact: "dead",
      readingsNeedAttention: true,
    });
    expect(scheme.headerClass).toBe(FLEET_CARD_COLORS.labHeader);
    expect(scheme.shellClass).toContain(FLEET_CARD_COLORS.readingsFill);
    expect(scheme.shellClass).toContain(FLEET_CARD_COLORS.deadBorder);
    expect(scheme.shellClass).toContain(FLEET_CARD_COLORS.deadRing);
    expect(scheme.railClass).toBe(FLEET_CARD_COLORS.deadRail);
    expect(scheme.stateSummary).toBe(
      "Lab, offline, readings need attention",
    );
  });
});
