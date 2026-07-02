import { describe, it, expect } from "vitest";
import {
  computeStatus,
  parseBatteryStatus,
  batteryStatusColor,
  computeSensorHealth,
  computeConnectivityWarning,
  decodePiThrottledState,
  LAST_OK_STALE_SEC,
} from "../src/lib/status";

describe("computeStatus", () => {
  it("returns live for < 5 minutes", () => {
    expect(computeStatus(0)).toBe("live");
    expect(computeStatus(299)).toBe("live");
  });

  it("returns stale for 5–30 minutes", () => {
    expect(computeStatus(300)).toBe("stale");
    expect(computeStatus(1799)).toBe("stale");
  });

  it("returns dead for > 30 minutes", () => {
    expect(computeStatus(1800)).toBe("dead");
    expect(computeStatus(99999)).toBe("dead");
  });
});

describe("parseBatteryStatus", () => {
  it("parses known statuses case-insensitively", () => {
    expect(parseBatteryStatus("good")).toBe("good");
    expect(parseBatteryStatus("Good")).toBe("good");
    expect(parseBatteryStatus("FAIR")).toBe("fair");
    expect(parseBatteryStatus("low")).toBe("low");
  });

  it("returns unknown for unrecognised values", () => {
    expect(parseBatteryStatus("charging")).toBe("unknown");
    expect(parseBatteryStatus(null)).toBe("unknown");
    expect(parseBatteryStatus(undefined)).toBe("unknown");
  });
});

describe("batteryStatusColor", () => {
  it("returns green for good", () => {
    expect(batteryStatusColor("good")).toContain("green");
  });

  it("returns amber for fair", () => {
    expect(batteryStatusColor("fair")).toContain("amber");
  });

  it("returns red for low", () => {
    expect(batteryStatusColor("low")).toContain("red");
  });
});

describe("computeSensorHealth", () => {
  const baseValues = {
    sensor_health_sps30_is_initialized: true,
    sensor_health_sps30_error_count: 0,
    sensor_health_scd41_is_initialized: true,
    sensor_health_scd41_error_count: 0,
  };

  it("counts healthy sensors correctly", () => {
    const result = computeSensorHealth(baseValues, {
      readingValues: { sps30_pm2_5: 4.5, scd41_co2_ppm: 420 },
      telemetryTs: 1000,
      nowSec: 1100,
    });
    expect(result.healthy).toBe(2);
    expect(result.total).toBe(2);
    expect(result.overallSeverity).toBe("healthy");
    expect(result.unhealthyLabels).toEqual([]);
    expect(result.telemetryAgeSeconds).toBe(100);
  });

  it("marks degraded when errors exist but reading is fresh", () => {
    const result = computeSensorHealth(
      {
        ...baseValues,
        sensor_health_sps30_error_count: 3,
      },
      {
        readingValues: { sps30_pm2_5: 4.5, scd41_co2_ppm: 420 },
      }
    );
    expect(result.healthy).toBe(1);
    expect(result.overallSeverity).toBe("degraded");
    expect(result.unhealthyLabels).toContain(
      "SPS30 (3 errors since last OK read)"
    );
  });

  it("marks unhealthy when sensor reading is stale", () => {
    const result = computeSensorHealth(baseValues, {
      staleSensors: new Set(["SPS30"]),
      readingValues: { sps30_pm2_5: 4.5, scd41_co2_ppm: 420 },
    });
    expect(result.overallSeverity).toBe("unhealthy");
    expect(result.unhealthyLabels).toContain("SPS30 (stale)");
  });

  it("marks unhealthy when stale and errors combine", () => {
    const result = computeSensorHealth(
      {
        ...baseValues,
        sensor_health_sps30_error_count: 10094,
      },
      {
        staleSensors: new Set(["SPS30"]),
        readingValues: { sps30_pm2_5: 4.65 },
      }
    );
    expect(result.unhealthyLabels[0]).toContain("stale");
    expect(result.unhealthyLabels[0]).toContain("10,094 errors");
  });

  it("ignores uninitialised sensors", () => {
    const result = computeSensorHealth({
      ...baseValues,
      sensor_health_sps30_is_initialized: false,
    });
    expect(result.healthy).toBe(1);
    expect(result.total).toBe(1);
  });

  it("returns 0/0 for empty values", () => {
    const result = computeSensorHealth({});
    expect(result.healthy).toBe(0);
    expect(result.total).toBe(0);
    expect(result.overallSeverity).toBe("healthy");
  });

  it("marks unhealthy when last_ok_ts is older than stale threshold", () => {
    const nowSec = 1_800_000_000;
    const result = computeSensorHealth(
      {
        ...baseValues,
        sensor_health_sps30_last_ok_ts: nowSec - LAST_OK_STALE_SEC - 60,
        sensor_health_scd41_last_ok_ts: nowSec - 30,
      },
      {
        readingValues: { sps30_pm2_5: 4.5, scd41_co2_ppm: 420 },
        nowSec,
      }
    );
    expect(result.overallSeverity).toBe("unhealthy");
    expect(result.unhealthyLabels).toContain("SPS30 (stale)");
    const sps30 = result.details.find((d) => d.label === "SPS30");
    expect(sps30?.lastOkAgeSec).toBeGreaterThan(LAST_OK_STALE_SEC);
    expect(sps30?.detail).toContain("no successful read");
  });

  it("includes last OK age and auto re-init count in sensor details", () => {
    const nowSec = 1_800_000_000;
    const result = computeSensorHealth(
      {
        ...baseValues,
        sensor_health_sps30_last_ok_ts: nowSec - 120,
        sensor_health_sps30_auto_reinit_count: 4,
      },
      {
        readingValues: { sps30_pm2_5: 4.5, scd41_co2_ppm: 420 },
        nowSec,
      }
    );
    const sps30 = result.details.find((d) => d.label === "SPS30");
    expect(sps30?.lastOkAgeSec).toBe(120);
    expect(sps30?.autoReinitCount).toBe(4);
    expect(sps30?.detail).toContain("operating normally");
    expect(result.overallSeverity).toBe("degraded");
  });

  it("defaults SPS30 auto re-init count to zero when missing from telemetry", () => {
    const nowSec = 1_800_000_000;
    const result = computeSensorHealth(
      {
        ...baseValues,
        sensor_health_sps30_last_ok_ts: nowSec - 120,
      },
      {
        readingValues: { sps30_pm2_5: 4.5, scd41_co2_ppm: 420 },
        nowSec,
      }
    );
    const sps30 = result.details.find((d) => d.label === "SPS30");
    expect(sps30?.autoReinitCount).toBe(0);
  });
});

describe("decodePiThrottledState", () => {
  it("returns healthy for 0x0", () => {
    const d = decodePiThrottledState("0x0");
    expect(d.isHealthy).toBe(true);
    expect(d.severity).toBe("none");
  });

  it("decodes 0x50000 as historical-only info severity", () => {
    const d = decodePiThrottledState("0x50000");
    expect(d.isHealthy).toBe(false);
    expect(d.severity).toBe("info");
    expect(d.currentIssues).toEqual([]);
    expect(d.historicalIssues).toContain("Undervoltage since boot");
    expect(d.historicalIssues).toContain("Throttled since boot");
  });

  it("treats active undervoltage as critical", () => {
    const d = decodePiThrottledState("0x1");
    expect(d.severity).toBe("critical");
    expect(d.currentIssues).toContain("Undervoltage detected");
  });
});

describe("computeConnectivityWarning", () => {
  it("detects tailscale down", () => {
    const values = { system_health_tailscale_backend_state: "Stopped" };
    expect(computeConnectivityWarning(values).tailscaleDown).toBe(true);
  });

  it("no warning when tailscale Running", () => {
    const values = { system_health_tailscale_backend_state: "Running" };
    expect(computeConnectivityWarning(values).tailscaleDown).toBe(false);
  });

  it("detects poor WiFi by signal level", () => {
    const values = { system_health_wifi_signal_level_dbm: -80 };
    expect(computeConnectivityWarning(values).wifiPoor).toBe(true);
  });

  it("detects poor WiFi by quality", () => {
    const values = { system_health_wifi_link_quality: 20 };
    expect(computeConnectivityWarning(values).wifiPoor).toBe(true);
  });

  it("no warning for good WiFi", () => {
    const values = {
      system_health_wifi_signal_level_dbm: -60,
      system_health_wifi_link_quality: 50,
    };
    expect(computeConnectivityWarning(values).wifiPoor).toBe(false);
  });
});
