import type { MetadataRoute } from "next";
import { getActors } from "@/lib/actors";

const BASE = "https://threat.triada.in";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: "always", priority: 1 },
    { url: `${BASE}/ransomware`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE}/actors`, changeFrequency: "weekly", priority: 0.6 },
    ...getActors().map((a) => ({ url: `${BASE}/actor/${a.id}`, changeFrequency: "daily" as const, priority: 0.4 })),
  ];
}
