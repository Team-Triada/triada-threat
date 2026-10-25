import { getJson } from "./http";
import { plain } from "./text";
import { memo } from "./memo";
import { safeUrl } from "../html";
import type { Victim } from "./types";

type RawVictim = {
  id?: string;
  group?: string;
  victim?: string;
  country?: string;
  activity?: string;
  description?: string;
  website?: string;
  discovered?: string;
  attackdate?: string;
  permalink?: string;
  screenshot?: string;
  infostealer?: unknown;
};

const KEY = process.env.RANSOMWARE_API_KEY;
const BASE = KEY ? "https://api-pro.ransomware.live" : "https://api.ransomware.live/v2";
const AUTH: HeadersInit = KEY ? { "X-Api-Key": KEY } : {};

function clean(s?: string | null): string | null {
  if (!s) return null;
  const t = plain(s).trim();
  return !t || t === "N/A" || t === "Not Found" ? null : t;
}

function normalize(v: RawVictim): Victim | null {
  const when = v.discovered ?? v.attackdate;
  if (!when || !v.victim) return null;
  return {
    id: v.id ?? `${v.group}-${v.victim}-${when}`,
    group: (v.group ?? "unknown").toLowerCase(),
    victim: plain(v.victim),
    countryCode: clean(v.country)?.toUpperCase() ?? null,
    sector: clean(v.activity),
    description: clean(v.description),
    website: clean(v.website),
    discoveredAt: when,
    attackedAt: v.attackdate ?? null,
    permalink: safeUrl(v.permalink),
    screenshot: safeUrl(v.screenshot),
    infostealer: Boolean(v.infostealer),
  };
}

const PUBLIC_BASE = "https://api.ransomware.live/v2";

// The public endpoint intermittently answers a valid request with a 404 page
// (seen alternating with 200 on identical calls), so retry a few times.
async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw last;
}

export async function fetchRecentVictims(): Promise<Victim[]> {
  type Resp = RawVictim[] | { victims: RawVictim[] };
  let raw: Resp;
  try {
    raw = KEY
      ? await getJson<Resp>(`${BASE}/victims/recent`, 120, { headers: AUTH }, 25000)
      : await withRetry(() => getJson<Resp>(`${PUBLIC_BASE}/recentvictims`, 120, undefined, 25000));
  } catch (e) {
    // A revoked, expired or rate-limited Pro key must not blank the whole feed:
    // the public endpoint serves the same recent claims with fewer fields.
    if (!KEY) throw e;
    raw = await withRetry(() => getJson<Resp>(`${PUBLIC_BASE}/recentvictims`, 120, undefined, 25000));
  }
  const list = Array.isArray(raw) ? raw : raw.victims ?? [];
  return list
    .map(normalize)
    .filter((v): v is Victim => v !== null)
    .sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt));
}

export async function fetchTotalVictims(): Promise<number | null> {
  if (!KEY) return null;
  const s = await getJson<{ stats?: { victims?: number } }>(`${BASE}/stats`, 600, { headers: AUTH });
  return s.stats?.victims ?? null;
}

export type GroupProfile = {
  name: string;
  description: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
  leakSites: number;
  totalVictims: number;
  ttps: { tactic: string; tacticId: string | null; techniques: { id: string; name: string }[] }[];
  vulnerabilities: { cve: string; vendor: string | null; product: string | null; cvss: number | null }[];
  tools: { category: string; items: string[] }[];
  recentVictims: Victim[];
  sectors: [string, number][];
  countries: [string, number][];
};

type RawGroup = {
  description?: string;
  firstseen?: string;
  lastseen?: string;
  victims?: number;
  locations?: unknown[];
  ttps?: { tactic_name?: string; tactic_id?: string; techniques?: { technique_id?: string; technique_name?: string }[] }[];
  vulnerabilities?: { CVE?: string; Vendor?: string; Product?: string; CVSS?: number }[];
  tools?: Record<string, string[]>;
};

function tally(list: Victim[], key: (v: Victim) => string | null): [string, number][] {
  const m = new Map<string, number>();
  for (const v of list) {
    const k = key(v);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
}

// Group bio (TTPs, exploited CVEs, tools) + full victim history. The history
// can be ~2 MB for big gangs, so it is memoised instead of fetch-cached.
export async function fetchGroupProfile(name: string): Promise<GroupProfile | null> {
  const slug = encodeURIComponent(name.toLowerCase());
  const infoUrl = KEY ? `${BASE}/group/${slug}` : `${PUBLIC_BASE}/group/${slug}`;
  const [info, history] = await Promise.allSettled([
    getJson<RawGroup>(infoUrl, 3600, { headers: AUTH }),
    KEY
      ? memo(`group-victims-${slug}`, 15 * 60_000, async () => {
          const r = await getJson<{ victims?: RawVictim[] }>(`${BASE}/victims/?group=${slug}`, 600, { headers: AUTH }, 30000);
          return (r.victims ?? []).map((v) => normalize({ ...v, group: name })).filter((v): v is Victim => v !== null);
        })
      : fetchRecentVictims().then((all) => all.filter((v) => v.group === name.toLowerCase())),
  ]);
  const i = info.status === "fulfilled" ? info.value : null;
  const list = (history.status === "fulfilled" ? history.value : []).sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt));
  if (!i && list.length === 0) return null;

  return {
    name,
    description: clean(typeof i?.description === "string" ? i.description : null),
    firstSeen: i?.firstseen ?? list.at(-1)?.discoveredAt ?? null,
    lastSeen: i?.lastseen ?? list[0]?.discoveredAt ?? null,
    leakSites: Array.isArray(i?.locations) ? i.locations.length : 0,
    totalVictims: typeof i?.victims === "number" ? i.victims : list.length,
    ttps: (i?.ttps ?? []).map((t) => ({
      tactic: t.tactic_name ?? "Other",
      tacticId: t.tactic_id ?? null,
      techniques: (t.techniques ?? [])
        .filter((x) => x.technique_id && x.technique_name)
        .map((x) => ({ id: x.technique_id!, name: plain(x.technique_name!) })),
    })),
    vulnerabilities: (i?.vulnerabilities ?? [])
      .filter((v) => v.CVE && /^CVE-\d{4}-\d{4,7}$/.test(v.CVE))
      .map((v) => ({ cve: v.CVE!, vendor: v.Vendor ?? null, product: v.Product ?? null, cvss: typeof v.CVSS === "number" ? v.CVSS : null }))
      .sort((a, b) => (b.cvss ?? 0) - (a.cvss ?? 0)),
    tools: Object.entries(i?.tools ?? {})
      .filter(([, items]) => Array.isArray(items) && items.length)
      .map(([category, items]) => ({ category: category.replace(/([a-z])([A-Z])/g, "$1 $2"), items: items.map((x) => plain(x)) })),
    recentVictims: list.slice(0, 40),
    sectors: tally(list, (v) => v.sector),
    countries: tally(list, (v) => v.countryCode),
  };
}
