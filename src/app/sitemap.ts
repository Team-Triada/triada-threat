import type { MetadataRoute } from "next";
import { getActors } from "@/lib/actors";
import { fetchKev } from "@/lib/live/kev";
import { fetchRecentVictims } from "@/lib/live/ransomware";
import { SITE_URL as BASE } from "@/lib/seo";

export const revalidate = 3600;

// Static pages and actors always; CVE pages come from the CISA KEV catalogue
// (a bounded, high-value set) and gang pages from groups seen recently.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [kev, victims] = await Promise.all([fetchKev().catch(() => []), fetchRecentVictims().catch(() => [])]);
  const groups = Array.from(new Set(victims.map((v) => v.group.toLowerCase())));
  return [
    { url: BASE, changeFrequency: "always", priority: 1 },
    { url: `${BASE}/ransomware`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE}/actors`, changeFrequency: "weekly", priority: 0.6 },
    ...groups.map((g) => ({ url: `${BASE}/ransomware/${encodeURIComponent(g)}`, changeFrequency: "daily" as const, priority: 0.6 })),
    ...kev.map((k) => ({ url: `${BASE}/cve/${k.id}`, lastModified: k.dateAdded, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...getActors().map((a) => ({ url: `${BASE}/actor/${a.id}`, changeFrequency: "daily" as const, priority: 0.4 })),
  ];
}
