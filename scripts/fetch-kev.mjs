// Pulls CISA's Known Exploited Vulnerabilities catalog and writes data/kev.json.
// No API key needed. Run: npm run fetch:kev
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const OUT_PATH = path.join(process.cwd(), "data", "kev.json");

async function main() {
  const res = await fetch(KEV_URL);
  if (!res.ok) throw new Error(`KEV fetch failed: ${res.status}`);
  const json = await res.json();

  const entries = (json.vulnerabilities ?? []).map((v) => ({
    id: v.cveID,
    vendor: v.vendorProject,
    product: v.product,
    name: v.vulnerabilityName,
    dateAdded: v.dateAdded,
    dueDate: v.dueDate,
    description: v.shortDescription,
    requiredAction: v.requiredAction,
    knownRansomwareUse: v.knownRansomwareCampaignUse === "Known",
  }));

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(
    OUT_PATH,
    JSON.stringify(
      { updatedAt: new Date().toISOString(), count: entries.length, entries },
      null,
      2
    )
  );
  console.log(`Wrote ${entries.length} KEV entries to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
