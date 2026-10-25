import "server-only";
import { getJson } from "./http";
import { REVALIDATE } from "./config";
import { geolocate } from "./geo";
import type { C2Server } from "../domain/types";

type Raw = {
  ip_address: string;
  port: number;
  status: string;
  as_name: string | null;
  country: string | null;
  first_seen: string;
  last_online: string | null;
  malware: string;
};

// The feed can keep a server marked "online" long after it was last seen (one was 227 days stale),
// so "online" here also needs a recent sighting.
const ACTIVE_WINDOW_MS = 14 * 24 * 3_600_000;

export function isActive(status: string, lastOnline: string | null, now = Date.now()): boolean {
  if (status !== "online") return false;
  if (!lastOnline) return true;
  const t = Date.parse(lastOnline);
  return !Number.isNaN(t) && now - t < ACTIVE_WINDOW_MS;
}

// abuse.ch Feodo Tracker: botnet C2 servers (Emotet, QakBot, Dridex, ...), with IP, port and country.
export async function fetchC2(): Promise<C2Server[]> {
  const raw = await getJson<Raw[]>("https://feodotracker.abuse.ch/downloads/ipblocklist.json", REVALIDATE.c2);
  const geo = await geolocate(raw.filter((r) => isActive(r.status, r.last_online)).map((r) => r.ip_address));
  return raw.map((r) => ({
    ip: r.ip_address,
    port: r.port,
    malware: r.malware,
    countryCode: r.country?.toUpperCase() ?? null,
    asName: r.as_name,
    firstSeen: r.first_seen.replace(" ", "T") + "Z",
    lastOnline: r.last_online,
    online: isActive(r.status, r.last_online),
    lat: geo.get(r.ip_address)?.lat ?? null,
    lng: geo.get(r.ip_address)?.lng ?? null,
    city: geo.get(r.ip_address)?.city ?? null,
  }));
}
