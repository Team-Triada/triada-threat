// Pulls the live article feed from news.triada.in — the canonical source of
// truth for news content. This repo does NOT vendor a copy of their
// enrichment pipeline; it references their public /api/feed route and
// stores only the response as a local cache for build-time rendering.
// Run: npm run fetch:news
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// Override with NEWS_FEED_URL for local testing against a dev triada-news instance.
const FEED_URL = process.env.NEWS_FEED_URL ?? "https://news.triada.in/api/feed";
const OUT_PATH = path.join(process.cwd(), "data", "news.json");

async function main() {
  const res = await fetch(FEED_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`news.triada.in feed fetch failed: ${res.status}`);
  const feed = await res.json();

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(feed, null, 2));
  console.log(`Wrote ${feed.items?.length ?? 0} articles (referenced from news.triada.in) to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
