import { getJson } from "./http";
import { plain } from "./text";
import { memo } from "./memo";
import { safeUrl } from "../html";
import type { CveRecord } from "./types";

const API = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const KEY = process.env.NVD_API_KEY;
const AUTH: HeadersInit = KEY ? { apiKey: KEY } : {};

type RawCve = {
  cve: {
    id: string;
    published: string;
    lastModified: string;
    descriptions?: { lang: string; value: string }[];
    weaknesses?: { description: { lang: string; value: string }[] }[];
    references?: { url: string; tags?: string[] }[];
    metrics?: Record<string, { cvssData: { baseScore: number; baseSeverity?: string; vectorString: string; version: string } }[]>;
    configurations?: { nodes: { cpeMatch?: { criteria: string }[] }[] }[];
  };
};

// NVD lists the same URL once per tag; merge so every URL appears once.
function dedupeRefs(refs: { url: string; tags?: string[] }[]): CveRecord["references"] {
  const byUrl = new Map<string, Set<string>>();
  for (const r of refs) {
    const url = safeUrl(r.url);
    if (!url) continue;
    const tags = byUrl.get(url) ?? new Set<string>();
    for (const t of r.tags ?? []) tags.add(t);
    byUrl.set(url, tags);
  }
  return Array.from(byUrl, ([url, tags]) => ({ url, tags: Array.from(tags) })).slice(0, 12);
}

function normalize(item: RawCve): CveRecord {
  const c = item.cve;
  const m = c.metrics ?? {};
  const metric = (m.cvssMetricV40 ?? m.cvssMetricV31 ?? m.cvssMetricV30 ?? m.cvssMetricV2)?.[0]?.cvssData;
  const cpe = c.configurations?.[0]?.nodes?.[0]?.cpeMatch?.[0]?.criteria?.split(":");
  return {
    id: c.id,
    published: c.published,
    lastModified: c.lastModified,
    description: plain(c.descriptions?.find((d) => d.lang === "en")?.value ?? ""),
    cvss: metric
      ? { score: metric.baseScore, severity: metric.baseSeverity ?? null, vector: metric.vectorString, version: metric.version }
      : null,
    weakness: c.weaknesses?.[0]?.description?.find((d) => d.lang === "en")?.value ?? null,
    references: dedupeRefs(c.references ?? []),
    vendor: cpe?.[3] && cpe[3] !== "*" ? cpe[3] : null,
    product: cpe?.[4] && cpe[4] !== "*" ? cpe[4] : null,
    epss: null,
    epssPercentile: null,
  };
}

// CVEs published in the last `hours`, highest CVSS first. NVD requires a
// bounded window (<=120 days), so we stay well inside it.
export function fetchRecentCves(hours = 48): Promise<CveRecord[]> {
  return memo(`nvd-recent-${hours}`, 10 * 60_000, () => loadRecentCves(hours));
}

async function loadRecentCves(hours: number): Promise<CveRecord[]> {
  // Round the window to 10-minute buckets so the URL (the cache key) is
  // stable within a bucket and NVD sees at most one call per bucket.
  const BUCKET = 600_000;
  const end = new Date(Math.floor(Date.now() / BUCKET) * BUCKET);
  const start = new Date(end.getTime() - hours * 3600_000);
  const url = `${API}?pubStartDate=${start.toISOString()}&pubEndDate=${end.toISOString()}&resultsPerPage=500`;
  const data = await getJson<{ vulnerabilities?: RawCve[] }>(url, 600, { headers: AUTH }, 30000);
  return (data.vulnerabilities ?? [])
    .map(normalize)
    .sort((a, b) => (b.cvss?.score ?? 0) - (a.cvss?.score ?? 0) || b.published.localeCompare(a.published));
}

// Thrown when NVD could not be asked or did not answer (cap reached, timeout,
// 5xx). Distinct from a null result, which means NVD answered "no such CVE":
// callers must not present an outage as a missing record.
export class NvdUnavailable extends Error {}

// Single-CVE lookups are driven by whatever IDs visitors (or crawlers) request.
// Cap them so a bot cycling random IDs cannot spend the whole NVD quota that the
// dashboard's own refresh also relies on. Over the cap the lookup is refused (NvdUnavailable).
const LOOKUP_WINDOW_MS = 60_000;
const LOOKUP_MAX = 30;
let lookups: number[] = [];

function allowLookup(): boolean {
  const now = Date.now();
  lookups = lookups.filter((t) => now - t < LOOKUP_WINDOW_MS);
  if (lookups.length >= LOOKUP_MAX) return false;
  lookups.push(now);
  return true;
}

export async function fetchCve(id: string): Promise<CveRecord | null> {
  if (!allowLookup()) throw new NvdUnavailable("lookup rate cap reached");
  try {
    const data = await getJson<{ vulnerabilities?: RawCve[] }>(`${API}?cveId=${encodeURIComponent(id)}`, 3600, { headers: AUTH });
    const v = data.vulnerabilities?.[0];
    return v ? normalize(v) : null;
  } catch {
    throw new NvdUnavailable("NVD request failed");
  }
}
