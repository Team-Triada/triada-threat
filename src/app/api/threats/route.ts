import { buildSnapshot } from "@/lib/live/snapshot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One snapshot for the whole dashboard. Upstream calls are cached already (lib/live/http.ts),
// so polling every minute is cheap. Gzipped by hand: route handlers aren't compressed here
// and the JSON is ~300 KB.
export async function GET(request: Request) {
  const body = JSON.stringify(await buildSnapshot());
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    Vary: "Accept-Encoding",
  };
  if (request.headers.get("accept-encoding")?.includes("gzip")) {
    const gz = new Blob([body]).stream().pipeThrough(new CompressionStream("gzip"));
    return new Response(gz, { headers: { ...headers, "Content-Encoding": "gzip" } });
  }
  return new Response(body, { headers });
}
