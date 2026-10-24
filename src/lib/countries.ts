import centroids from "../../data/country-centroids.json";

type Centroid = { name: string; lat: number; lng: number };
const C = centroids as Record<string, Centroid>;

export function country(code: string | null | undefined): Centroid | null {
  return code ? C[code.toUpperCase()] ?? null : null;
}

export function countryName(code: string | null | undefined): string {
  return country(code)?.name ?? code ?? "Unknown";
}

// Deterministic jitter so many points in one country don't stack on the
// centroid, and stay put across polls.
export function jitter(seed: string, spread: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 10000) / 10000 - 0.5) * 2 * spread;
}
