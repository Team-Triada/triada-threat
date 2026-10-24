import { getJson } from "./http";
import { geolocate } from "./geo";
import { isIp } from "../html";
import type { ScannerSource } from "./types";

type Raw = { rank: number; source: string; reports: number; targets: number }[];

// SANS Internet Storm Center / DShield: the day's top attacking IPs as seen by
// a worldwide honeypot/firewall-log sensor network. Real sources, real counts.
export async function fetchScanners(): Promise<ScannerSource[]> {
  let raw = await getJson<Raw>("https://isc.sans.edu/api/topips/records/25?json", 900);
  raw = raw.filter((r) => isIp(r.source));
  const geo = await geolocate(raw.map((r) => r.source));
  return raw.flatMap((r): ScannerSource[] => {
    const g = geo.get(r.source);
    if (!g) return [];
    return [{ ip: r.source, reports: r.reports, targets: r.targets, lat: g.lat, lng: g.lng, countryCode: g.countryCode, city: g.city, org: g.org }];
  });
}
