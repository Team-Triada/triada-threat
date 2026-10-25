import { describe, expect, it } from "vitest";
import type { Article, C2Server, CveRecord, KevItem, ScannerSource, ThreatSnapshot, Victim } from "@/lib/domain/types";
import { slimSnapshot } from "@/lib/domain/slim";
import { MAX_SCAN_EVENTS, MAX_TIMED_EVENTS, buildEvents, c2Events, computeStats, cveEvents, kevEvents, last24h, newsEvents, scanEvents, topCounts, victimEvents, victimSeverity } from "@/lib/live/events";

const NOW = Date.parse("2026-10-24T12:00:00Z");
const ago = (hours: number) => new Date(NOW - hours * 3_600_000).toISOString();

const victim = (o: Partial<Victim> = {}): Victim => ({ id: "v1", group: "qilin", victim: "Acme", countryCode: "US", sector: "Manufacturing", description: "d", website: null, discoveredAt: ago(1), attackedAt: null, permalink: "https://x.test/v1", screenshot: null, infostealer: false, ...o });
const kev = (o: Partial<KevItem> = {}): KevItem => ({ id: "CVE-2026-1", vendor: "V", product: "P", name: "Bug", dateAdded: ago(24), dueDate: "2099-01-01", description: "d", requiredAction: "a", ransomwareUse: false, cwes: [], ...o });
const cve = (score: number | null, o: Partial<CveRecord> = {}): CveRecord => ({ id: "CVE-2026-2", published: ago(2), lastModified: ago(2), description: "x".repeat(300), cvss: score === null ? null : { score, severity: null, vector: "", version: "3.1" }, weakness: null, references: [], vendor: null, product: null, epss: null, epssPercentile: null, ...o });
const article = (o: Partial<Article> = {}): Article => ({ id: "a1", title: "T", summary: "s", link: "https://n.test/a1", source: "Src", publishedAt: ago(5), cves: [], tags: [], severity: "medium", countryCodes: ["DE"], ...o });
const c2 = (o: Partial<C2Server> = {}): C2Server => ({ ip: "1.2.3.4", port: 443, malware: "Emotet", countryCode: "NL", asName: "AS1", firstSeen: ago(24), lastOnline: null, online: true, lat: null, lng: null, city: null, ...o });
const scanner = (o: Partial<ScannerSource> = {}): ScannerSource => ({ ip: "5.6.7.8", reports: 1200, targets: 60, lat: 1, lng: 2, countryCode: "CN", city: "X", org: "Org", ...o });

describe("victim events", () => {
  it("marks critical-infrastructure sectors critical, others high", () => {
    expect(victimSeverity(victim({ sector: "Healthcare" }))).toBe("critical");
    expect(victimSeverity(victim({ sector: "Energy & Utilities" }))).toBe("critical");
    expect(victimSeverity(victim({ sector: "Manufacturing" }))).toBe("high");
    expect(victimSeverity(victim({ sector: null }))).toBe("high");
  });
  it("builds a readable title, stable id and a fallback subtitle", () => {
    const [e] = victimEvents([victim({ sector: null, countryCode: null })]);
    expect(e).toMatchObject({ id: "rw:v1", kind: "ransomware", title: "qilin claims Acme", subtitle: "Leak-site posting", ref: { type: "ransomware", id: "v1" } });
  });
});

describe("windows and thresholds", () => {
  it("keeps KEV entries from the last 14 days only", () => {
    expect(kevEvents([kev({ id: "A", dateAdded: ago(24 * 13) }), kev({ id: "B", dateAdded: ago(24 * 15) })], NOW).map((e) => e.ref.id)).toEqual(["A"]);
  });
  it("makes ransomware-linked KEV entries critical", () => {
    expect(kevEvents([kev({ ransomwareUse: true })], NOW)[0].severity).toBe("critical");
    expect(kevEvents([kev()], NOW)[0].severity).toBe("high");
  });
  it("only streams CVEs scored 8.0 or higher, and 9.0+ is critical", () => {
    const out = cveEvents([cve(7.9, { id: "L" }), cve(8, { id: "H" }), cve(9, { id: "C" }), cve(null, { id: "N" })]);
    expect(out.map((e) => [e.ref.id, e.severity])).toEqual([["H", "high"], ["C", "critical"]]);
    expect(out[0].subtitle.length).toBe(120);
  });
  it("keeps news from the last 48 hours and uses the first named country", () => {
    const out = newsEvents([article({ id: "in", publishedAt: ago(47) }), article({ id: "out", publishedAt: ago(49) }), article({ id: "none", countryCodes: [] })], NOW);
    expect(out.map((e) => e.ref.id)).toEqual(["in", "none"]);
    expect(out[0].countryCode).toBe("DE");
    expect(out[1].countryCode).toBeNull();
  });
  it("lists only online C2 servers first seen in the last 14 days", () => {
    const out = c2Events([c2({ ip: "1.1.1.1" }), c2({ ip: "2.2.2.2", online: false }), c2({ ip: "3.3.3.3", firstSeen: ago(24 * 20) })], NOW);
    expect(out.map((e) => e.ref.id)).toEqual(["1.1.1.1:443"]);
  });
});

describe("scanner events", () => {
  it("are stamped now, capped, and graded by how many sensors they hit", () => {
    const out = scanEvents(Array.from({ length: 12 }, (_, i) => scanner({ ip: `9.9.9.${i}`, targets: i === 0 ? 5 : 80 })), NOW);
    expect(out).toHaveLength(MAX_SCAN_EVENTS);
    expect(out[0].severity).toBe("medium");
    expect(out[1].severity).toBe("high");
    expect(new Set(out.map((e) => e.time))).toEqual(new Set([new Date(NOW).toISOString()]));
  });
  it("pluralises sensors correctly", () => {
    expect(scanEvents([scanner({ targets: 1 })], NOW)[0].subtitle).toContain("hit 1 sensor");
    expect(scanEvents([scanner({ targets: 1 })], NOW)[0].subtitle).not.toContain("sensors");
  });
});

describe("buildEvents", () => {
  const src = (over = {}) => ({ victims: [], kev: [], cves: [], articles: [], c2: [], scanners: [], ...over });
  it("sorts timed events newest first and puts scanner rows last", () => {
    const out = buildEvents(src({ victims: [victim({ id: "old", discoveredAt: ago(10) }), victim({ id: "new", discoveredAt: ago(1) })], articles: [article({ id: "mid", publishedAt: ago(5) })], scanners: [scanner()] }), NOW);
    expect(out.map((e) => e.ref.id)).toEqual(["new", "mid", "old", "5.6.7.8"]);
  });
  it("caps timed events but never drops the scanner rows", () => {
    const many = Array.from({ length: MAX_TIMED_EVENTS + 50 }, (_, i) => victim({ id: `v${i}`, discoveredAt: ago(1 + i / 1000) }));
    const out = buildEvents(src({ victims: many, scanners: [scanner()] }), NOW);
    expect(out).toHaveLength(MAX_TIMED_EVENTS + 1);
    expect(out.at(-1)?.kind).toBe("scan");
  });
  it("produces unique ids across kinds", () => {
    const out = buildEvents(src({ victims: [victim()], kev: [kev()], cves: [cve(9)], articles: [article()], c2: [c2()], scanners: [scanner()] }), NOW);
    expect(new Set(out.map((e) => e.id)).size).toBe(out.length);
  });
});

describe("stats and ranking", () => {
  it("counts the last 24 hours, 7 days and the critical CVEs from all of NVD", () => {
    const victims = [victim({ id: "a", group: "g1", discoveredAt: ago(2) }), victim({ id: "b", group: "g1", discoveredAt: ago(3) }), victim({ id: "c", group: "g2", discoveredAt: ago(30) })];
    const s = computeStats({ victims, kev: [kev({ id: "K1", dateAdded: ago(24 * 3) }), kev({ id: "K2", dateAdded: ago(24 * 9), ransomwareUse: true })], cves: [], allCves: [cve(9.8), cve(9), cve(5)], articles: [article({ publishedAt: ago(3) }), article({ id: "old", publishedAt: ago(30) })], c2: [c2(), c2({ online: false })], scanners: [], victimsTotal: 1234 }, NOW);
    expect(s).toEqual({ victims24h: 2, victimsTotal: 1234, activeGroups24h: 1, kevAdded7d: 1, kevTotal: 2, kevRansomware: 1, critical24h: 2, c2Online: 1, articles24h: 1 });
  });
  it("last24h filters by discovery time", () => expect(last24h([victim({ discoveredAt: ago(23) }), victim({ id: "x", discoveredAt: ago(25) })], NOW)).toHaveLength(1));
  it("topCounts ranks, skips nulls and respects the limit", () => {
    expect(topCounts([{ g: "a" }, { g: "b" }, { g: "a" }, { g: null }, { g: "c" }], (x) => x.g, 2)).toEqual([["a", 2], ["b", 1]]);
  });
});

describe("slimSnapshot", () => {
  const full = (): ThreatSnapshot => ({ generatedAt: "t", events: [...victimEvents(Array.from({ length: 60 }, (_, i) => victim({ id: `v${i}` }))), ...scanEvents(Array.from({ length: 8 }, (_, i) => scanner({ ip: `7.7.7.${i}` })), NOW)], victims: [victim()], kev: [kev()], cves: [cve(9)], c2: [], scanners: [], articles: Array.from({ length: 80 }, (_, i) => article({ id: `a${i}`, summary: "long", tags: ["x"], cves: ["CVE-1"] })), stats: {} as ThreatSnapshot["stats"], topGroups: [], topGroup24h: null, topCountries: [], topSectors: [], sources: [] });
  it("keeps 45 timed and 5 scanner events and flags itself as slim", () => {
    const s = slimSnapshot(full());
    expect(s.slim).toBe(true);
    expect(s.events.filter((e) => e.kind !== "scan")).toHaveLength(45);
    expect(s.events.filter((e) => e.kind === "scan")).toHaveLength(5);
  });
  it("drops the heavy fields but keeps what the first screen shows", () => {
    const s = slimSnapshot(full());
    expect(s.kev).toEqual([]);
    expect(s.cves).toEqual([]);
    expect(s.victims[0]).toMatchObject({ victim: "Acme", group: "qilin", description: null, permalink: null });
    expect(s.articles).toHaveLength(60);
    expect(s.articles[0].summary).toBe("");
  });
});
