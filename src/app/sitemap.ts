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
  // Newest claim per group, so a group page is "modified" when that gang posts.
  const lastPost = new Map<string, string>();
  for (const v of victims) {
    const g = v.group.toLowerCase();
    if (!lastPost.has(g) || v.discoveredAt > lastPost.get(g)!) lastPost.set(g, v.discoveredAt);
  }
  const newest = victims.reduce((a, v) => (v.discoveredAt > a ? v.discoveredAt : a), "");
  return [
    { url: BASE, changeFrequency: "always", priority: 1 },
    { url: `${BASE}/ransomware`, ...(newest && { lastModified: newest }), changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE}/actors`, changeFrequency: "weekly", priority: 0.6 },
    ...Array.from(lastPost, ([g, at]) => ({ url: `${BASE}/ransomware/${encodeURIComponent(g)}`, lastModified: at, changeFrequency: "daily" as const, priority: 0.6 })),
    ...kev.map((k) => ({ url: `${BASE}/cve/${k.id}`, lastModified: k.dateAdded, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...getActors().map((a) => ({ url: `${BASE}/actor/${a.id}`, changeFrequency: "daily" as const, priority: 0.4 })),
  ];
}
