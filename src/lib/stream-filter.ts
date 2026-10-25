import type { Severity, ThreatEvent } from "@/lib/domain/types";
import { countryName } from "@/lib/countries";

export type SortMode = "newest" | "severity";
export type MinSeverity = "all" | "high" | "critical";

export type StreamFilter = {
  query: string;
  minSeverity: MinSeverity;
  countryCode: string | null;
  sort: SortMode;
};

export const DEFAULT_FILTER: StreamFilter = { query: "", minSeverity: "all", countryCode: null, sort: "newest" };

const RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
const MIN_RANK: Record<MinSeverity, number> = { all: 0, high: 3, critical: 4 };

// Lowercased search text per event, built once. Events are replaced on every poll (not mutated),
// so the WeakMap cleans itself up and a keystroke is one substring scan per row.
const haystacks = new WeakMap<ThreatEvent, string>();

function haystack(e: ThreatEvent): string {
  let h = haystacks.get(e);
  if (h === undefined) {
    h = [e.title, e.subtitle, e.source, e.kind, e.ref.id, e.severity, e.countryCode, countryName(e.countryCode)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    haystacks.set(e, h);
  }
  return h;
}

export function isFiltered(f: StreamFilter): boolean {
  return f.query.trim() !== "" || f.minSeverity !== "all" || f.countryCode !== null;
}

// Input is expected newest-first (the snapshot order). "newest" keeps it; the
// severity sort is stable, so equal ranks stay newest-first.
export function filterEvents(events: ThreatEvent[], f: StreamFilter, layerOn: (e: ThreatEvent) => boolean): ThreatEvent[] {
  const terms = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  const min = MIN_RANK[f.minSeverity];
  const out: ThreatEvent[] = [];
  for (const e of events) {
    if (!layerOn(e)) continue;
    if (min && RANK[e.severity] < min) continue;
    if (f.countryCode && e.countryCode !== f.countryCode) continue;
    if (terms.length) {
      const h = haystack(e);
      if (!terms.every((t) => h.includes(t))) continue;
    }
    out.push(e);
  }
  if (f.sort === "severity") out.sort((a, b) => RANK[b.severity] - RANK[a.severity]);
  return out;
}
