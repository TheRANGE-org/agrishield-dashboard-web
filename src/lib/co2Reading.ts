/** SCD41 stays the CO₂ source when that reading is present. */

export const SCD41_CO2_PPM = "scd41_co2_ppm";
export const SCD41_CO2_PPM_MAX = "scd41_co2_ppm_max";
export const MHZ19E_CO2_PPM = "mhz19e_co2_ppm";
export const MHZ19E_CO2_PPM_MAX = "mhz19e_co2_ppm_max";

export type Co2SensorLabel = "SCD41" | "MH-Z19E";

export interface Co2Reading {
  ppm: number | null;
  avgMetric: string;
  peakMetric: string;
  sensorLabel: Co2SensorLabel;
}

type ReadingValues = Record<string, number | string | boolean | null> | undefined;

/**
 * Fleet tile, node chart, and stale checks share this choice.
 * MH-Z19E is used only when the SCD41 CO₂ reading is absent.
 * The visible tile label stays "CO₂"; sensorLabel is for health and stale badges.
 */
export function selectCo2Reading(values: ReadingValues): Co2Reading {
  const scd41 = values?.[SCD41_CO2_PPM];
  if (typeof scd41 === "number") {
    return {
      ppm: scd41,
      avgMetric: SCD41_CO2_PPM,
      peakMetric: SCD41_CO2_PPM_MAX,
      sensorLabel: "SCD41",
    };
  }
  const mhz = values?.[MHZ19E_CO2_PPM];
  if (typeof mhz === "number") {
    return {
      ppm: mhz,
      avgMetric: MHZ19E_CO2_PPM,
      peakMetric: MHZ19E_CO2_PPM_MAX,
      sensorLabel: "MH-Z19E",
    };
  }
  return {
    ppm: null,
    avgMetric: SCD41_CO2_PPM,
    peakMetric: SCD41_CO2_PPM_MAX,
    sensorLabel: "SCD41",
  };
}
