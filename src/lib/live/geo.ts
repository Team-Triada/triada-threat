// Real IP geolocation (city-level lat/lng) via ip-api.com batch endpoint.
// Free tier is limited to 45 req/min, so results are memoised per process.
export type Geo = { lat: number; lng: number; countryCode: string; city: string | null; org: string | null };

const TTL = 12 * 3600_000;
const cache = new Map<string, { geo: Geo | null; at: number }>();

export async function geolocate(ips: string[]): Promise<Map<string, Geo>> {
  const now = Date.now();
  const todo = Array.from(new Set(ips)).filter((ip) => {
    const c = cache.get(ip);
    return !c || now - c.at > TTL;
  });
  for (let i = 0; i < todo.length; i += 100) {
    const chunk = todo.slice(i, i + 100);
    try {
      const res = await fetch("http://ip-api.com/batch?fields=status,query,countryCode,city,lat,lon,org", {
        method: "POST",
        body: JSON.stringify(chunk),
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const rows = (await res.json()) as { status: string; query: string; countryCode: string; city: string; lat: number; lon: number; org: string }[];
      for (const r of rows) {
        cache.set(r.query, {
          at: now,
          geo: r.status === "success" ? { lat: r.lat, lng: r.lon, countryCode: r.countryCode, city: r.city || null, org: r.org || null } : null,
        });
      }
    } catch {
      /* geolocation is best-effort; callers fall back to country centroids */
    }
  }
  const out = new Map<string, Geo>();
  for (const ip of ips) {
    const g = cache.get(ip)?.geo;
    if (g) out.set(ip, g);
  }
  return out;
}
