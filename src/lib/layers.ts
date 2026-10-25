import type { EventKind } from "@/lib/domain/types";

export type LayerState = Record<EventKind, boolean>;

export const DEFAULT_LAYERS: LayerState = { ransomware: true, kev: true, cve: true, c2: true, scan: true, news: true };

export const LAYER_META: Record<EventKind, { label: string; color: string; description: string }> = {
  ransomware: { label: "Ransomware", color: "#ff8c3c", description: "Victims claimed on gang leak sites (ransomware.live)" },
  kev: { label: "Exploited", color: "#ff3c3c", description: "CVEs added to the CISA Known Exploited Vulnerabilities catalog in the last 14 days" },
  cve: { label: "New CVEs", color: "#ffcc3c", description: "CVEs with CVSS 8.0 or higher published in the last 48h (NVD)" },
  c2: { label: "Botnet C2", color: "#c77dff", description: "Online botnet command-and-control servers (abuse.ch Feodo Tracker)" },
  scan: { label: "Scanners", color: "#19d3c5", description: "Top attacking IPs seen by the SANS ISC DShield honeypot network, geolocated" },
  news: { label: "News", color: "#3c9dff", description: "Security news from 11 publisher feeds, tagged by country where named" },
};
