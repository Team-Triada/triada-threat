import type { ThreatSnapshot } from "./types";

// Trimmed copy for the server-rendered HTML. It's embedded as JSON for hydration, so size costs
// parse time. Keeps what the first screen needs: stats, first stream rows, map shading, panels.
export function slimSnapshot(s: ThreatSnapshot): ThreatSnapshot {
  const timed = s.events.filter((e) => e.kind !== "scan").slice(0, 45);
  const scans = s.events.filter((e) => e.kind === "scan").slice(0, 5);
  return {
    ...s,
    slim: true,
    events: [...timed, ...scans],
    victims: s.victims.map((v) => ({
      id: v.id,
      group: v.group,
      victim: v.victim,
      countryCode: v.countryCode,
      sector: v.sector,
      discoveredAt: v.discoveredAt,
      description: null,
      website: null,
      attackedAt: null,
      permalink: null,
      screenshot: null,
      infostealer: v.infostealer,
    })),
    kev: [],
    cves: [],
    articles: s.articles.slice(0, 60).map((a) => ({ id: a.id, title: a.title, summary: "", link: a.link, source: a.source, publishedAt: a.publishedAt, cves: [], tags: [], severity: a.severity, countryCodes: a.countryCodes })),
  };
}
