import "server-only";
import type { Article, C2Server, CveRecord, KevItem, ScannerSource, Severity, ThreatEvent, ThreatSnapshot, Victim } from "../domain/types";

// Pure functions that turn upstream records into stream events and headline numbers.
// No I/O: snapshot.ts fetches, this file shapes. Everything takes `now` so it can be tested.

const HOUR = 3_600_000;

// How far back each source contributes timed events, and how many rows the stream keeps.
export const WINDOW_MS = { kev: 14 * 24 * HOUR, news: 48 * HOUR, c2: 14 * 24 * HOUR } as const;
export const MAX_TIMED_EVENTS = 250;
export const MAX_SCAN_EVENTS = 8;

const CRITICAL_SECTORS = /health|hospital|energy|utilit|financ|bank|government|public|education|transport|telecom|water/i;

export function victimSeverity(v: Victim): Severity {
  return v.sector && CRITICAL_SECTORS.test(v.sector) ? "critical" : "high";
}

export function victimEvents(victims: Victim[]): ThreatEvent[] {
  return victims.map((v) => ({
    id: `rw:${v.id}`,
    kind: "ransomware",
    time: v.discoveredAt,
    title: `${v.group} claims ${v.victim}`,
    subtitle: [v.sector, v.countryCode].filter(Boolean).join(" · ") || "Leak-site posting",
    severity: victimSeverity(v),
    countryCode: v.countryCode,
    source: "ransomware.live",
    url: v.permalink,
    ref: { type: "ransomware", id: v.id },
  }));
}

export function kevEvents(kev: KevItem[], now: number): ThreatEvent[] {
  return kev
    .filter((k) => now - new Date(k.dateAdded).getTime() < WINDOW_MS.kev)
    .map((k) => ({
      id: `kev:${k.id}`,
      kind: "kev",
      time: new Date(k.dateAdded).toISOString(),
      title: `${k.id} added to CISA KEV: ${k.vendor} ${k.product}`,
      subtitle: k.name,
      severity: k.ransomwareUse ? "critical" : "high",
      countryCode: null,
      source: "CISA KEV",
      url: `/cve/${k.id}`,
      ref: { type: "kev", id: k.id },
    }));
}

// Only CVEs NVD already scores 8.0 or higher make the stream.
export function cveEvents(cves: CveRecord[]): ThreatEvent[] {
  return cves
    .filter((c) => (c.cvss?.score ?? 0) >= 8)
    .map((c) => ({
      id: `cve:${c.id}`,
      kind: "cve",
      time: c.published,
      title: `${c.id} · CVSS ${c.cvss?.score}`,
      subtitle: c.description.slice(0, 120),
      severity: (c.cvss?.score ?? 0) >= 9 ? "critical" : "high",
      countryCode: null,
      source: "NVD",
      url: `/cve/${c.id}`,
      ref: { type: "cve", id: c.id },
    }));
}

export function newsEvents(articles: Article[], now: number): ThreatEvent[] {
  return articles
    .filter((a) => now - new Date(a.publishedAt).getTime() < WINDOW_MS.news)
    .map((a) => ({
      id: `news:${a.id}`,
      kind: "news",
      time: a.publishedAt,
      title: a.title,
      subtitle: a.source,
      severity: a.severity,
      countryCode: a.countryCodes[0] ?? null,
      source: a.source,
      url: a.link,
      ref: { type: "news", id: a.id },
    }));
}

export function c2Events(c2: C2Server[], now: number): ThreatEvent[] {
  return c2
    .filter((s) => s.online && now - new Date(s.firstSeen).getTime() < WINDOW_MS.c2)
    .map((s) => ({
      id: `c2:${s.ip}:${s.port}`,
      kind: "c2",
      time: s.firstSeen,
      title: `${s.malware} C2 online · ${s.ip}:${s.port}`,
      subtitle: [s.asName, s.countryCode].filter(Boolean).join(" · "),
      severity: "high",
      countryCode: s.countryCode,
      source: "abuse.ch Feodo",
      url: null,
      ref: { type: "c2", id: `${s.ip}:${s.port}` },
    }));
}

// Daily aggregates, not timed events: stamped "now" so the stream shows them as "today", and
// kept after the timed events so they never interleave with them.
export function scanEvents(scanners: ScannerSource[], now: number): ThreatEvent[] {
  return scanners.slice(0, MAX_SCAN_EVENTS).map((s) => ({
    id: `scan:${s.ip}`,
    kind: "scan",
    time: new Date(now).toISOString(),
    title: `Mass scanner ${s.ip} · ${s.reports.toLocaleString()} reports`,
    subtitle: `${[s.city, s.countryCode].filter(Boolean).join(", ")} · hit ${s.targets.toLocaleString()} sensor${s.targets === 1 ? "" : "s"}${s.org ? ` · ${s.org}` : ""}`,
    severity: s.targets >= 50 ? "high" : "medium",
    countryCode: s.countryCode,
    source: "SANS ISC DShield",
    url: `https://isc.sans.edu/ipinfo/${s.ip}`,
    ref: { type: "scan", id: s.ip },
  }));
}

export type EventSources = { victims: Victim[]; kev: KevItem[]; cves: CveRecord[]; articles: Article[]; c2: C2Server[]; scanners: ScannerSource[] };

// Timed events newest first (capped), then the scanner aggregates.
export function buildEvents(src: EventSources, now: number): ThreatEvent[] {
  const timed = [...victimEvents(src.victims), ...kevEvents(src.kev, now), ...cveEvents(src.cves), ...newsEvents(src.articles, now), ...c2Events(src.c2, now)];
  timed.sort((a, b) => b.time.localeCompare(a.time));
  return [...timed.slice(0, MAX_TIMED_EVENTS), ...scanEvents(src.scanners, now)];
}

// Most frequent non-null keys, highest first.
export function topCounts<T>(items: T[], key: (t: T) => string | null, n: number): [string, number][] {
  const counts = new Map<string, number>();
  for (const i of items) {
    const k = key(i);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, n);
}

// Claims posted in the last 24 hours.
export function last24h(victims: Victim[], now: number): Victim[] {
  return victims.filter((v) => now - new Date(v.discoveredAt).getTime() < 24 * HOUR);
}

// `allCves` is every CVE NVD returned (not just the ones shown), so the critical count is the real one.
export function computeStats(src: EventSources & { allCves: CveRecord[]; victimsTotal: number | null }, now: number): ThreatSnapshot["stats"] {
  const last24 = last24h(src.victims, now);
  return {
    victims24h: last24.length,
    victimsTotal: src.victimsTotal,
    activeGroups24h: new Set(last24.map((v) => v.group)).size,
    kevAdded7d: src.kev.filter((k) => now - new Date(k.dateAdded).getTime() < 7 * 24 * HOUR).length,
    kevTotal: src.kev.length,
    kevRansomware: src.kev.filter((k) => k.ransomwareUse).length,
    critical24h: src.allCves.filter((c) => (c.cvss?.score ?? 0) >= 9).length,
    c2Online: src.c2.filter((s) => s.online).length,
    articles24h: src.articles.filter((a) => now - new Date(a.publishedAt).getTime() < 24 * HOUR).length,
  };
}
