// Pulls the real, official MITRE ATT&CK Enterprise STIX bundle and extracts
// intrusion-set (threat actor group) objects plus their technique/malware
// relationships. This is the live source of truth MITRE itself publishes —
// no key needed. Country/attribution isn't part of the ATT&CK data model
// (MITRE deliberately doesn't publish nation-state attribution), so that
// stays in the small hand-curated data/actor-attribution.json overlay.
// Run: npm run fetch:attack
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const BUNDLE_URL =
  "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json";
const OUT_PATH = path.join(process.cwd(), "data", "attack-groups.json");

function mitreId(obj) {
  return obj.external_references?.find((r) => r.source_name === "mitre-attack")?.external_id ?? null;
}

async function main() {
  console.log("Downloading MITRE ATT&CK Enterprise STIX bundle (large file)...");
  const res = await fetch(BUNDLE_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`ATT&CK bundle fetch failed: ${res.status}`);
  const bundle = await res.json();
  const objects = bundle.objects ?? [];
  console.log(`  ${objects.length} STIX objects`);

  const groups = objects.filter((o) => o.type === "intrusion-set" && !o.revoked && !o.x_mitre_deprecated);
  const techniquesById = new Map(
    objects.filter((o) => o.type === "attack-pattern").map((o) => [o.id, { name: o.name, mitreId: mitreId(o) }])
  );
  const malwareById = new Map(
    objects
      .filter((o) => o.type === "malware" || o.type === "tool")
      .map((o) => [o.id, o.name])
  );
  const relationships = objects.filter((o) => o.type === "relationship" && o.relationship_type === "uses");

  const byGroupId = new Map();
  for (const rel of relationships) {
    if (!rel.source_ref?.startsWith("intrusion-set--")) continue;
    if (!byGroupId.has(rel.source_ref)) byGroupId.set(rel.source_ref, { techniques: [], malware: [] });
    const bucket = byGroupId.get(rel.source_ref);
    if (rel.target_ref?.startsWith("attack-pattern--")) {
      const t = techniquesById.get(rel.target_ref);
      if (t?.mitreId) bucket.techniques.push(t.mitreId);
    } else if (rel.target_ref?.startsWith("malware--") || rel.target_ref?.startsWith("tool--")) {
      const m = malwareById.get(rel.target_ref);
      if (m) bucket.malware.push(m);
    }
  }

  const result = groups
    .map((g) => {
      const id = mitreId(g);
      if (!id) return null;
      const rel = byGroupId.get(g.id) ?? { techniques: [], malware: [] };
      return {
        mitreId: id,
        slug: id.toLowerCase(),
        name: g.name,
        aliases: (g.aliases ?? []).filter((a) => a !== g.name),
        description: (g.description ?? "").split("\n")[0].slice(0, 600),
        techniques: Array.from(new Set(rel.techniques)).sort(),
        malwareFamilies: Array.from(new Set(rel.malware)).sort(),
        mitreUrl: g.external_references?.find((r) => r.source_name === "mitre-attack")?.url ?? null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.mitreId.localeCompare(b.mitreId));

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(
    OUT_PATH,
    JSON.stringify({ updatedAt: new Date().toISOString(), count: result.length, groups: result }, null, 2)
  );
  console.log(`Wrote ${result.length} ATT&CK groups to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
