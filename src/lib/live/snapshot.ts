import "server-only";
import { fetchRecentVictims, fetchTotalVictims } from "./ransomware";
import { fetchKev } from "./kev";
import { fetchRecentCves } from "./nvd";
import { fetchEpss } from "./epss";
import { fetchC2 } from "./c2";
import { fetchScanners } from "./scanners";
import { fetchArticles } from "./feeds";
import type { Severity, SourceHealth, ThreatEvent, ThreatSnapshot, Victim } from "../domain/types";

const HOUR = 3600_000;
const CRITICAL_SECTORS = /health|hospital|energy|utilit|financ|bank|government|public|education|transport|telecom|water/i;

function victimSeverity(v: Victim): Severity {
  return v.sector && CRITICAL_SECTORS.test(v.sector) ? "critical" : "high";
}

function top<T>(items: T[], key: (t: T) => string | null, n: number) {
  const counts = new Map<string, number>();
  for (const i of items) {
    const k = key(i);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, n);
}

async function track<T>(name: string, fn: () => Promise<T>, count: (t: T) => number, sources: SourceHealth[], fallback: T, newest?: (t: T) => string | null): Promise<T> {
  const fetchedAt = new Date().toISOString();
  try {
    const value = await fn();
    sources.push({ name, ok: true, fetchedAt, count: count(value), newestAt: newest?.(value) ?? null });
    return value;
  } catch (e) {
    sources.push({ name, ok: false, fetchedAt, count: 0, error: e instanceof Error ? e.message : String(e) });
    return fallback;
  }
}

// Concurrent callers (ISR render + several pollers) share one in-flight build,
// and a finished build is reused for a few seconds, so a burst of visitors
// can never fan out into a burst of upstream requests.
let inflight: Promise<ThreatSnapshot> | null = null;
let memo: { at: number; snap: ThreatSnapshot } | null = null;

export async function buildSnapshot(): Promise<ThreatSnapshot> {
  if (memo && Date.now() - memo.at < 20_000) return memo.snap;
  inflight ??= compute()
    .then((snap) => {
      memo = { at: Date.now(), snap };
      return snap;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

async function compute(): Promise<ThreatSnapshot> {
  const sources: SourceHealth[] = [];
  const now = Date.now();

  const [victims, total, kev, cvesRaw, c2, scanners, feed] = await Promise.all([
    track("ransomware.live", fetchRecentVictims, (v) => v.length, sources, [], (v) => v[0]?.discoveredAt ?? null),
    track("ransomware.live stats", fetchTotalVictims, (n) => (n ? 1 : 0), sources, null),
    track("CISA KEV", fetchKev, (k) => k.length, sources, [], (k) => (k[0] ? new Date(k[0].dateAdded).toISOString() : null)),
    track("NVD", fetchRecentCves, (c) => c.length, sources, [], (c) => c.map((x) => x.published).sort().at(-1) ?? null),
    track("abuse.ch Feodo", fetchC2, (c) => c.length, sources, [], (c) => c.map((x) => x.firstSeen).sort().at(-1) ?? null),
    track("SANS ISC DShield", fetchScanners, (s) => s.length, sources, []),
    track("Security news RSS", fetchArticles, (f) => f.articles.length, sources, { articles: [], errors: [] }, (f) => f.articles[0]?.publishedAt ?? null),
  ]);
  const articles = feed.articles;

  // EPSS for the CVEs we will actually show: top by CVSS plus recent KEV.
  const cves = cvesRaw.slice(0, 60);
  const epssIds = [...cves.map((c) => c.id), ...kev.slice(0, 40).map((k) => k.id)];
  const epss = await track("FIRST EPSS", () => fetchEpss(epssIds), (m) => m.size, sources, new Map());
  for (const c of cves) {
    const e = epss.get(c.id);
    if (e) {
      c.epss = e.epss;
      c.epssPercentile = e.percentile;
    }
  }

  const events: ThreatEvent[] = [];

  for (const v of victims) {
    events.push({
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
    });
  }

  for (const k of kev.filter((k) => now - new Date(k.dateAdded).getTime() < 14 * 24 * HOUR)) {
    events.push({
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
    });
  }

  for (const c of cves.filter((c) => (c.cvss?.score ?? 0) >= 8)) {
    events.push({
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
    });
  }

  for (const a of articles.filter((a) => now - new Date(a.publishedAt).getTime() < 48 * HOUR)) {
    events.push({
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
    });
  }

  for (const s of c2.filter((s) => s.online && now - new Date(s.firstSeen).getTime() < 14 * 24 * HOUR)) {
    events.push({
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
    });
  }

  events.sort((a, b) => b.time.localeCompare(a.time));

  const scanEvents: ThreatEvent[] = [];
  for (const s of scanners.slice(0, 8)) {
    scanEvents.push({
      id: `scan:${s.ip}`,
      kind: "scan",
      // Daily aggregate, not a timed event: the stream shows it as "today" and sorts it last.
      time: new Date(now).toISOString(),
      title: `Mass scanner ${s.ip} · ${s.reports.toLocaleString()} reports`,
      subtitle: `${[s.city, s.countryCode].filter(Boolean).join(", ")} · hit ${s.targets.toLocaleString()} sensor${s.targets === 1 ? "" : "s"}${s.org ? ` · ${s.org}` : ""}`,
      severity: s.targets >= 50 ? "high" : "medium",
      countryCode: s.countryCode,
      source: "SANS ISC DShield",
      url: `https://isc.sans.edu/ipinfo/${s.ip}`,
      ref: { type: "scan", id: s.ip },
    });
  }


  const last24 = victims.filter((v) => now - new Date(v.discoveredAt).getTime() < 24 * HOUR);

  return {
    generatedAt: new Date().toISOString(),
    events: [...events.slice(0, 250), ...scanEvents],
    victims: victims.map((v) => ({ ...v, description: v.description?.slice(0, 280) ?? null })),
    kev: kev.slice(0, 40).map((k) => ({ ...k, description: k.description.slice(0, 400) })),
    cves: cves.map((c) => ({ ...c, description: c.description.slice(0, 500), references: c.references.slice(0, 6) })),
    c2,
    scanners,
    articles: articles.slice(0, 100).map((a) => ({ ...a, summary: a.summary.slice(0, 300) })),
    stats: {
      victims24h: last24.length,
      victimsTotal: total,
      activeGroups24h: new Set(last24.map((v) => v.group)).size,
      kevAdded7d: kev.filter((k) => now - new Date(k.dateAdded).getTime() < 7 * 24 * HOUR).length,
      kevTotal: kev.length,
      kevRansomware: kev.filter((k) => k.ransomwareUse).length,
      critical24h: cvesRaw.filter((c) => (c.cvss?.score ?? 0) >= 9).length,
      c2Online: c2.filter((s) => s.online).length,
      articles24h: articles.filter((a) => now - new Date(a.publishedAt).getTime() < 24 * HOUR).length,
    },
    topGroups: top(victims, (v) => v.group, 8).map(([group, count]) => ({ group, count })),
    topGroup24h: top(last24, (v) => v.group, 1)[0]?.[0] ?? null,
    topCountries: top(victims, (v) => v.countryCode, 8).map(([code, count]) => ({ code, count })),
    topSectors: top(victims, (v) => v.sector, 6).map(([sector, count]) => ({ sector, count })),
    sources,
  };
}

// Smaller copy for the server-rendered HTML. The page embeds this as JSON for
// hydration, so every byte costs parse time on the critical path. Keeps what
// the first screen needs (stats, first stream rows, map shading, panels).
export function slimSnapshot(s: ThreatSnapshot): ThreatSnapshot {
  const timed = s.events.filter((e) => e.kind !== "scan").slice(0, 45);
  const scans = s.events.filter((e) => e.kind === "scan").slice(0, 5);
  return {
    ...s,
    slim: true,
    events: [...timed, ...scans],
    victims: s.victims.map((v) => ({
      id: v.id,
      group: v.group,
      victim: v.victim,
      countryCode: v.countryCode,
      sector: v.sector,
      discoveredAt: v.discoveredAt,
      description: null,
      website: null,
      attackedAt: null,
      permalink: null,
      screenshot: null,
      infostealer: v.infostealer,
    })),
    kev: [],
    cves: [],
    articles: s.articles.slice(0, 60).map((a) => ({ id: a.id, title: a.title, summary: "", link: a.link, source: a.source, publishedAt: a.publishedAt, cves: [], tags: [], severity: a.severity, countryCodes: a.countryCodes })),
  };
}
