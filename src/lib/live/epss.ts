import "server-only";
import { getJson } from "./http";

// EPSS = FIRST.org's probability a CVE is exploited in the wild in the next
// 30 days. Public, keyless, batchable.
export async function fetchEpss(ids: string[]): Promise<Map<string, { epss: number; percentile: number }>> {
  const out = new Map<string, { epss: number; percentile: number }>();
  const unique = Array.from(new Set(ids)).slice(0, 300);
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const res = await getJson<{ data?: { cve: string; epss: string; percentile: string }[] }>(
      `https://api.first.org/data/v1/epss?cve=${chunk.join(",")}`,
      3600
    );
    for (const r of res.data ?? []) out.set(r.cve, { epss: Number(r.epss), percentile: Number(r.percentile) });
  }
  return out;
}
