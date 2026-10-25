import "server-only";

// Every cache and timing knob for the data layer, in one place.
//
// `revalidate` values are seconds and go to Next's fetch cache (see http.ts). `*_MS` values are
// milliseconds and drive the in-process caches (see memo.ts, geo.ts, snapshot.ts). Keep the
// revalidate values above zero: 0 makes every route that reads the source render dynamically.
export const REVALIDATE = {
  ransomwareRecent: 120,
  ransomwareStats: 600,
  ransomwareGroup: 3600,
  ransomwareGroupVictims: 600,
  kev: 3600,
  nvdRecent: 600,
  nvdCve: 3600,
  epss: 3600,
  feeds: 300,
  c2: 300,
  scanners: 900,
  geo: 43_200,
} as const;

export const MEMO_MS = {
  kev: 30 * 60_000,
  nvdRecent: 10 * 60_000,
  groupVictims: 15 * 60_000,
  geoHit: 12 * 3600_000,
  geoMiss: 15 * 60_000,
  snapshot: 20_000,
} as const;
