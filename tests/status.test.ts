import { describe, it, expect } from "vitest";
import {
  computeStatus,
  parseBatteryStatus,
  batteryStatusColor,
  computeSensorHealth,
  computeConnectivityWarning,
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
  it("counts healthy sensors correctly", () => {
    const values = {
      sensor_health_sps30_is_initialized: true,
      sensor_health_sps30_error_count: 0,
      sensor_health_scd41_is_initialized: true,
      sensor_health_scd41_error_count: 0,
    };
    expect(computeSensorHealth(values)).toEqual({ healthy: 2, total: 2 });
  });

  it("handles unhealthy sensor", () => {
    const values = {
      sensor_health_sps30_is_initialized: true,
      sensor_health_sps30_error_count: 3,
      sensor_health_scd41_is_initialized: true,
      sensor_health_scd41_error_count: 0,
    };
    expect(computeSensorHealth(values)).toEqual({ healthy: 1, total: 2 });
  });

  it("ignores uninitialised sensors", () => {
    const values = {
      sensor_health_sps30_is_initialized: false,
      sensor_health_sps30_error_count: 0,
      sensor_health_scd41_is_initialized: true,
      sensor_health_scd41_error_count: 0,
    };
    expect(computeSensorHealth(values)).toEqual({ healthy: 1, total: 1 });
  });

  it("returns 0/0 for empty values", () => {
    expect(computeSensorHealth({})).toEqual({ healthy: 0, total: 0 });
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
