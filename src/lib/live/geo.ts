// IP -> country + network owner through IPinfo Lite (free, HTTPS, no quota, attribution required).
// Needs IPINFO_TOKEN; without it nothing is looked up.
//
// Lite has no coordinates, so each dot goes at the country centroid plus a small fixed offset
// (same idea as the C2 dots) so they don't stack or move between polls.
import "server-only";
import { getJson } from "./http";
import { MEMO_MS, REVALIDATE } from "./config";
import { country, jitter } from "../countries";
import { isIp } from "../html";
import { plain } from "./text";

export type Geo = { lat: number; lng: number; countryCode: string; city: string | null; org: string | null };

const TOKEN = process.env.IPINFO_TOKEN;
const CONCURRENCY = 6;
const cache = new Map<string, { geo: Geo | null; until: number }>();

type Raw = { country_code?: string; asn?: string; as_name?: string };

async function lookup(ip: string): Promise<Geo | null> {
  const r = await getJson<Raw>(`https://api.ipinfo.io/lite/${encodeURIComponent(ip)}`, REVALIDATE.geo, { headers: { Authorization: `Bearer ${TOKEN}` } }, 8000);
  const code = typeof r.country_code === "string" ? r.country_code.toUpperCase() : "";
  const c = /^[A-Z]{2}$/.test(code) ? country(code) : null;
  if (!c) return null;
  const org = plain([r.asn, r.as_name].filter((x): x is string => typeof x === "string" && x !== "").join(" ").slice(0, 80)) || null;
  return { lat: c.lat + jitter(`${ip}a`, 1.5), lng: c.lng + jitter(`${ip}b`, 1.5), countryCode: code, city: null, org };
}

export async function geolocate(ips: string[]): Promise<Map<string, Geo>> {
  const out = new Map<string, Geo>();
  if (!TOKEN) return out;
  const now = Date.now();
  const unique = Array.from(new Set(ips)).filter(isIp);
  const todo = unique.filter((ip) => (cache.get(ip)?.until ?? 0) <= now);
  // A few requests at a time: polite to the API, and one failure (rate limit,
  // bad token) does not hold up the rest.
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    await Promise.all(
      todo.slice(i, i + CONCURRENCY).map(async (ip) => {
        try {
          cache.set(ip, { geo: await lookup(ip), until: now + MEMO_MS.geoHit });
        } catch {
          cache.set(ip, { geo: null, until: now + MEMO_MS.geoMiss });
        }
      }),
    );
  }
  for (const ip of unique) {
    const g = cache.get(ip)?.geo;
    if (g) out.set(ip, g);
  }
  return out;
}
