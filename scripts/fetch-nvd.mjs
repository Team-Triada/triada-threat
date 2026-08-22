// Pulls real CVE detail (CVSS, description, weakness, references) from the
// live NVD 2.0 API. Two passes:
//   1. Recently-published/modified CVEs (last N days) — genuinely "live" feed
//   2. Specific CVE IDs already referenced by KEV/news but missing detail
// NVD rate-limits unauthenticated callers to 5 req/30s; set NVD_API_KEY to
// raise that to 50 req/30s. Run: npm run fetch:nvd
import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";

const API = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const OUT_PATH = path.join(process.cwd(), "data", "nvd.json");
const KEV_PATH = path.join(process.cwd(), "data", "kev.json");
const NEWS_PATH = path.join(process.cwd(), "data", "news.json");

const API_KEY = process.env.NVD_API_KEY;
const RATE_DELAY_MS = API_KEY ? 700 : 6500;
const RECENT_DAYS = 7;
const MAX_TARGETED_LOOKUPS = 60; // cap per run so this stays fast without a key

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function nvdFetch(params) {
  const url = new URL(API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: API_KEY ? { apiKey: API_KEY } : {},
  });
  if (!res.ok) throw new Error(`NVD ${res.status}: ${await res.text()}`);
  return res.json();
}

function extractCvss(metrics) {
  if (!metrics) return null;
  const v31 = metrics.cvssMetricV31?.[0]?.cvssData;
  const v30 = metrics.cvssMetricV30?.[0]?.cvssData;
  const v2 = metrics.cvssMetricV2?.[0]?.cvssData;
  const m = v31 ?? v30 ?? v2;
  if (!m) return null;
  return { score: m.baseScore, severity: m.baseSeverity ?? null, vector: m.vectorString };
}

function normalizeCve(item) {
  const cve = item.cve;
  const desc = cve.descriptions?.find((d) => d.lang === "en")?.value ?? "";
  const weakness = cve.weaknesses?.[0]?.description?.find((d) => d.lang === "en")?.value ?? null;
  const refs = (cve.references ?? []).slice(0, 8).map((r) => r.url);
  const config = cve.configurations?.[0]?.nodes?.[0]?.cpeMatch?.[0]?.criteria ?? null;

  return {
    id: cve.id,
    published: cve.published,
    lastModified: cve.lastModified,
    description: desc.slice(0, 800),
    cvss: extractCvss(cve.metrics),
    weakness,
    references: refs,
    cpe: config,
  };
}

async function fetchRecent() {
  const end = new Date();
  const start = new Date(end.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000);
  const data = await nvdFetch({
    lastModStartDate: start.toISOString(),
    lastModEndDate: end.toISOString(),
    resultsPerPage: 2000,
  });
  return (data.vulnerabilities ?? []).map(normalizeCve);
}

async function fetchTargeted(ids, seenIds) {
  const results = [];
  let count = 0;
  for (const id of ids) {
    if (seenIds.has(id) || count >= MAX_TARGETED_LOOKUPS) continue;
    try {
      const data = await nvdFetch({ cveId: id });
      const vuln = data.vulnerabilities?.[0];
      if (vuln) results.push(normalizeCve(vuln));
    } catch (err) {
      console.error(`NVD lookup failed for ${id}: ${err.message}`);
    }
    count += 1;
    await sleep(RATE_DELAY_MS);
  }
  return results;
}

async function loadReferencedCveIds() {
  const ids = new Set();
  try {
    const kev = JSON.parse(await readFile(KEV_PATH, "utf8"));
    for (const e of kev.entries ?? []) ids.add(e.id);
  } catch {}
  try {
    const news = JSON.parse(await readFile(NEWS_PATH, "utf8"));
    for (const item of news.items ?? []) for (const c of item.cves ?? []) ids.add(c);
  } catch {}
  return ids;
}

async function main() {
  console.log(`Fetching CVEs modified in the last ${RECENT_DAYS} days...`);
  const recent = await fetchRecent();
  console.log(`  got ${recent.length}`);

  const seen = new Set(recent.map((r) => r.id));
  const referenced = await loadReferencedCveIds();
  const missing = Array.from(referenced).filter((id) => !seen.has(id));

  console.log(`Filling detail for ${Math.min(missing.length, MAX_TARGETED_LOOKUPS)} referenced CVEs not in recent window...`);
  const targeted = await fetchTargeted(missing, seen);
  console.log(`  got ${targeted.length}`);

  const all = [...recent, ...targeted];
  const byId = Object.fromEntries(all.map((c) => [c.id, c]));

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(
    OUT_PATH,
    JSON.stringify({ updatedAt: new Date().toISOString(), count: all.length, cves: byId }, null, 2)
  );
  console.log(`Wrote ${all.length} CVE records to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
