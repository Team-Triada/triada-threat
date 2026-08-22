// Pulls real ransomware leak-site activity from the ransomware.live Pro API
// (api-pro.ransomware.live) — victims, group roster with real victim totals,
// per-group bios/TTPs for the most active current families, and global
// stats. Falls back to the free public API (api.ransomware.live/v2) if no
// RANSOMWARE_API_KEY is set. Run: npm run fetch:ransomware
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "./lib/env.mjs";

loadEnvFile();

const API_KEY = process.env.RANSOMWARE_API_KEY;
const BASE = API_KEY ? "https://api-pro.ransomware.live" : "https://api.ransomware.live/v2";
const HEADERS = API_KEY ? { "X-Api-Key": API_KEY, Accept: "application/json" } : { Accept: "application/json" };

const OUT_VICTIMS = path.join(process.cwd(), "data", "ransomware.json");
const OUT_GROUPS = path.join(process.cwd(), "data", "ransomware-groups.json");
const TOP_GROUP_DETAIL_COUNT = 15;
const RATE_DELAY_MS = 400;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function get(pathname) {
  const res = await fetch(`${BASE}${pathname}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`${pathname} -> ${res.status}`);
  return res.json();
}

function normalizeVictim(v) {
  return {
    id: v.id ?? `${v.group ?? "unknown"}-${v.victim ?? ""}-${v.discovered ?? ""}`,
    family: v.group ?? "Unknown",
    victim: v.victim ?? "Unknown",
    countryCode: v.country ?? null,
    sector: v.activity && v.activity !== "Not Found" ? v.activity : null,
    description: v.description ?? null,
    discoveredAt: v.discovered ?? v.attackdate ?? null,
    domain: v.website ?? v.domain ?? null,
    detailUrl: v.permalink ?? v.url ?? null,
    pressUrl: v.press ?? null,
  };
}

async function main() {
  console.log(`Fetching from ${BASE} ${API_KEY ? "(authenticated pro)" : "(public, no key)"}...`);

  const recentPath = API_KEY ? "/victims/recent" : "/recentvictims";
  const recentRaw = await get(recentPath);
  const victims = (Array.isArray(recentRaw) ? recentRaw : recentRaw.victims ?? []).map(normalizeVictim);
  console.log(`  ${victims.length} recent victims`);

  let stats = null;
  let groupRoster = [];
  if (API_KEY) {
    try {
      const statsRaw = await get("/stats");
      stats = statsRaw.stats ?? null;
    } catch (err) {
      console.error(`stats fetch failed: ${err.message}`);
    }
    try {
      const groupsRaw = await get("/groups");
      groupRoster = (groupsRaw.groups ?? []).sort((a, b) => b.victims - a.victims);
      console.log(`  ${groupRoster.length} groups in roster`);
    } catch (err) {
      console.error(`groups fetch failed: ${err.message}`);
    }
  }

  await mkdir(path.dirname(OUT_VICTIMS), { recursive: true });
  await writeFile(
    OUT_VICTIMS,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        source: API_KEY ? "ransomware.live pro API" : "ransomware.live public API",
        stats,
        count: victims.length,
        victims,
      },
      null,
      2
    )
  );
  console.log(`Wrote ${victims.length} victim records to ${OUT_VICTIMS}`);

  if (!API_KEY || groupRoster.length === 0) return;

  // Pull real bios/TTPs for the most active families currently posting —
  // union of top-by-total-victims and families seen in the recent feed.
  const activeFamilies = new Set(victims.map((v) => v.family.toLowerCase()));
  const targets = groupRoster
    .filter((g) => activeFamilies.has(g.group.toLowerCase()) || groupRoster.indexOf(g) < TOP_GROUP_DETAIL_COUNT)
    .slice(0, TOP_GROUP_DETAIL_COUNT);

  const details = [];
  for (const g of targets) {
    try {
      const d = await get(`/group/${encodeURIComponent(g.group)}`);
      details.push({
        group: d.group ?? g.group,
        altname: g.altname ?? null,
        victimsTotal: g.victims,
        description: d.description ?? null,
        firstSeen: d.firstseen ?? null,
        lastSeen: d.lastseen ?? null,
        leakSiteCount: Array.isArray(d.locations) ? d.locations.length : 0,
      });
    } catch (err) {
      console.error(`group detail failed for ${g.group}: ${err.message}`);
    }
    await sleep(RATE_DELAY_MS);
  }

  await writeFile(
    OUT_GROUPS,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        roster: groupRoster,
        details,
      },
      null,
      2
    )
  );
  console.log(`Wrote ${groupRoster.length} group roster entries + ${details.length} detailed bios to ${OUT_GROUPS}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
