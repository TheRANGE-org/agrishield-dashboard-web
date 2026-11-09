import { describe, expect, it } from "vitest";
import { selectCo2Reading } from "../src/lib/co2Reading";

describe("selectCo2Reading", () => {
  it("keeps SCD41 when that reading is present", () => {
    const reading = selectCo2Reading({
      scd41_co2_ppm: 510,
      mhz19e_co2_ppm: 430,
    });
    expect(reading.ppm).toBe(510);
    expect(reading.avgMetric).toBe("scd41_co2_ppm");
    expect(reading.sensorLabel).toBe("SCD41");
  });

  it("uses MH-Z19E when SCD41 is absent", () => {
    const reading = selectCo2Reading({ mhz19e_co2_ppm: 436.2 });
    expect(reading.ppm).toBe(436.2);
    expect(reading.avgMetric).toBe("mhz19e_co2_ppm");
    expect(reading.peakMetric).toBe("mhz19e_co2_ppm_max");
    expect(reading.sensorLabel).toBe("MH-Z19E");
  });

  it("stays on SCD41 fields when neither reading is present", () => {
    const reading = selectCo2Reading({});
    expect(reading.ppm).toBeNull();
    expect(reading.avgMetric).toBe("scd41_co2_ppm");
    expect(reading.sensorLabel).toBe("SCD41");
  });
});
