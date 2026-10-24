import { buildSnapshot } from "@/lib/live/snapshot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One aggregated snapshot for the dashboard. Upstream calls are individually
// cached (see lib/live/http.ts), so polling this every minute is cheap.
// The JSON is ~300 KB raw and compresses ~10x, so gzip it explicitly: the
// framework does not compress route-handler bodies on its own here.
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
