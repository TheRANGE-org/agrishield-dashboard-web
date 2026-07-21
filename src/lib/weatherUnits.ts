export function celsiusToFahrenheit(c: number): number {
  return (c * 9/5) + 32;
}

export function hpaToInHg(hpa: number): number {
  return hpa * 0.02953;
}

export function msToMph(ms: number): number {
  return ms * 2.23694;
}

export function mmToInches(mm: number): number {
  return mm / 25.4;
}

export function formatTempF(c: number | null | undefined): string {
  if (c == null) return "—";
  return `${celsiusToFahrenheit(c).toFixed(1)} °F`;
}

export function formatPressureInHg(hpa: number | null | undefined): string {
  if (hpa == null) return "—";
  return `${hpaToInHg(hpa).toFixed(2)} inHg`;
}

export function formatWindMph(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return `${msToMph(ms).toFixed(1)} mph`;
}

export function getCompassDirection(degrees: number | null | undefined): string {
  if (degrees == null) return "—";
  const points = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const val = Math.floor((degrees / 22.5) + 0.5);
  return points[val % 16];
}
