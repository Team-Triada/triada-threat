import "server-only";
import { fetchRecentVictims, fetchTotalVictims } from "./ransomware";
import { fetchKev } from "./kev";
import { fetchRecentCves } from "./nvd";
import { fetchEpss } from "./epss";
import { fetchC2 } from "./c2";
import { fetchScanners } from "./scanners";
import { fetchArticles } from "./feeds";
import { MEMO_MS } from "./config";
import { buildEvents, computeStats, last24h, topCounts } from "./events";
import type { SourceHealth, ThreatSnapshot } from "../domain/types";

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

// Concurrent callers (ISR render, pollers) share one in-flight build and reuse a finished one
// for a few seconds, so a burst of visitors can't become a burst of upstream requests.
let inflight: Promise<ThreatSnapshot> | null = null;
let memo: { at: number; snap: ThreatSnapshot } | null = null;

export async function buildSnapshot(): Promise<ThreatSnapshot> {
  if (memo && Date.now() - memo.at < MEMO_MS.snapshot) return memo.snap;
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

  const input = { victims, kev, cves, articles, c2, scanners };

  return {
    generatedAt: new Date().toISOString(),
    events: buildEvents(input, now),
    victims: victims.map((v) => ({ ...v, description: v.description?.slice(0, 280) ?? null })),
    kev: kev.slice(0, 40).map((k) => ({ ...k, description: k.description.slice(0, 400) })),
    cves: cves.map((c) => ({ ...c, description: c.description.slice(0, 500), references: c.references.slice(0, 6) })),
    c2,
    scanners,
    articles: articles.slice(0, 100).map((a) => ({ ...a, summary: a.summary.slice(0, 300) })),
    stats: computeStats({ ...input, allCves: cvesRaw, victimsTotal: total }, now),
    topGroups: topCounts(victims, (v) => v.group, 8).map(([group, count]) => ({ group, count })),
    topGroup24h: topCounts(last24h(victims, now), (v) => v.group, 1)[0]?.[0] ?? null,
    topCountries: topCounts(victims, (v) => v.countryCode, 8).map(([code, count]) => ({ code, count })),
    topSectors: topCounts(victims, (v) => v.sector, 6).map(([sector, count]) => ({ sector, count })),
    sources,
  };
}
