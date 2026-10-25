// Best-effort country tagging for news by name/demonym/known-org mention.
// Deliberately conservative: capitalised whole-word matches only, and names
// that collide with common words (Chad, Jordan, Georgia, Mali...) are left out.
import "server-only";
import centroids from "../../../data/country-centroids.json";

const NAMES = centroids as Record<string, { name: string }>;

const SKIP = new Set(["TD", "JO", "GE", "ML", "NE", "GN", "TG", "MA", "CG", "CD", "SB"]);

const ALIASES: Record<string, string[]> = {
  US: ["U.S.", "US-based", "American", "Americans", "Washington", "Pentagon", "FBI", "CISA"],
  GB: ["UK", "U.K.", "Britain", "British", "England", "NCSC"],
  RU: ["Russian", "Russians", "Moscow", "Kremlin"],
  CN: ["Chinese", "Beijing", "PRC"],
  IN: ["Indian", "Indians", "eMudhra", "Aadhaar", "CERT-In", "New Delhi", "Mumbai"],
  KR: ["South Korean", "Seoul"],
  KP: ["North Korean", "Pyongyang", "DPRK"],
  IR: ["Iranian", "Tehran"],
  IL: ["Israeli", "Tel Aviv"],
  DE: ["German", "Germans", "Berlin"],
  FR: ["French", "Paris"],
  JP: ["Japanese", "Tokyo"],
  UA: ["Ukrainian", "Kyiv", "Kiev"],
  AU: ["Australian", "Sydney"],
  CA: ["Canadian"],
  BR: ["Brazilian"],
  IT: ["Italian"],
  ES: ["Spanish"],
  NL: ["Dutch"],
  PL: ["Polish"],
  TR: ["Turkish"],
  SA: ["Saudi"],
  AE: ["UAE", "Emirati", "Dubai"],
  PK: ["Pakistani"],
  TW: ["Taiwanese"],
  SG: ["Singaporean"],
  VN: ["Vietnamese"],
  ID: ["Indonesian"],
  MX: ["Mexican"],
  ZA: ["South African"],
  NG: ["Nigerian"],
};

type Rule = { code: string; re: RegExp };
const RULES: Rule[] = [];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const [code, { name }] of Object.entries(NAMES)) {
  if (SKIP.has(code)) continue;
  const words = [name, ...(ALIASES[code] ?? [])];
  RULES.push({ code, re: new RegExp(`(?<![\\w-])(?:${words.map(esc).join("|")})(?![\\w])`) });
}
for (const code of Object.keys(ALIASES)) {
  if (!RULES.some((r) => r.code === code)) RULES.push({ code, re: new RegExp(`(?<![\\w-])(?:${ALIASES[code].map(esc).join("|")})(?![\\w])`) });
}

// Earliest mention wins (headlines lead with the subject), title before body.
export function geotag(title: string, summary: string): string[] {
  const hits: { code: string; pos: number }[] = [];
  for (const { code, re } of RULES) {
    const t = title.match(re);
    if (t?.index !== undefined) hits.push({ code, pos: t.index });
    else {
      const s = summary.match(re);
      if (s?.index !== undefined) hits.push({ code, pos: 10_000 + s.index });
    }
  }
  return hits.sort((a, b) => a.pos - b.pos).slice(0, 3).map((h) => h.code);
}
