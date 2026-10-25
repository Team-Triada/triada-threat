import "server-only";
import { getJson } from "./http";
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

// abuse.ch Feodo Tracker: botnet C2 servers (Emotet, QakBot, Dridex, ...).
// Real IPs with a country, updated by abuse.ch every few minutes.
export async function fetchC2(): Promise<C2Server[]> {
  const raw = await getJson<Raw[]>("https://feodotracker.abuse.ch/downloads/ipblocklist.json", 300);
  const geo = await geolocate(raw.filter((r) => r.status === "online").map((r) => r.ip_address));
  return raw.map((r) => ({
    ip: r.ip_address,
    port: r.port,
    malware: r.malware,
    countryCode: r.country?.toUpperCase() ?? null,
    asName: r.as_name,
    firstSeen: r.first_seen.replace(" ", "T") + "Z",
    lastOnline: r.last_online,
    online: r.status === "online",
    lat: geo.get(r.ip_address)?.lat ?? null,
    lng: geo.get(r.ip_address)?.lng ?? null,
    city: geo.get(r.ip_address)?.city ?? null,
  }));
}
