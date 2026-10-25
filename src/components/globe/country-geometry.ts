/* eslint-disable @typescript-eslint/no-explicit-any -- GeoJSON coordinates are nested arrays of varying depth */

// Pure geometry for picking a country from a point on the globe. Kept out of the
// component so it can be tested without WebGL.

// The slice of a GeoJSON country feature the picking code reads.
export type CountryFeature = {
  properties: Record<string, string | number>;
  geometry?: { type: string; coordinates: any } | null;
};

// Natural Earth leaves ISO_A2 as "-99" for a few countries (France, Norway...).
export function isoOf(f: CountryFeature): string | null {
  const iso = String(f.properties.ISO_A2);
  if (iso !== "-99") return iso;
  const wb = String(f.properties.WB_A2 ?? "");
  if (wb && wb !== "-99") return wb;
  return f.properties.NAME === "Norway" ? "NO" : null;
}

type Ring = [number, number][];

function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ISO code of the country containing lat/lng (outer ring minus holes).
export function countryAt(features: CountryFeature[], lat: number, lng: number): string | null {
  for (const f of features) {
    const g = f.geometry;
    if (!g) continue;
    const polys: Ring[][] = g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];
    for (const [outer, ...holes] of polys) {
      if (inRing(lng, lat, outer) && !holes.some((h) => inRing(lng, lat, h))) return isoOf(f);
    }
  }
  return null;
}
