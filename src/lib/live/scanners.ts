import "server-only";
import { getJson } from "./http";
import { geolocate } from "./geo";
import { isIp } from "../html";
import type { ScannerSource } from "../domain/types";

type Raw = { rank: number; source: string; reports: number; targets: number }[];

// SANS ISC DShield: today's top attacking IPs from their worldwide honeypot and firewall-log sensors.
export async function fetchScanners(): Promise<ScannerSource[]> {
  let raw = await getJson<Raw>("https://isc.sans.edu/api/topips/records/25?json", 900);
  raw = raw.filter((r) => isIp(r.source));
  const geo = await geolocate(raw.map((r) => r.source));
  // Raw IPs exist but none could be placed on the map: say why instead of
  // reporting a healthy empty source.
  if (raw.length > 0 && geo.size === 0) throw new Error(process.env.IPINFO_TOKEN ? "IP geolocation (IPinfo) returned no results" : "IP geolocation not configured: set IPINFO_TOKEN");
  return raw.flatMap((r): ScannerSource[] => {
    const g = geo.get(r.source);
    if (!g) return [];
    return [{ ip: r.source, reports: r.reports, targets: r.targets, lat: g.lat, lng: g.lng, countryCode: g.countryCode, city: g.city, org: g.org }];
  });
}
