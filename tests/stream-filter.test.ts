import { describe, expect, it } from "vitest";
import type { Severity, ThreatEvent } from "@/lib/domain/types";
import { DEFAULT_FILTER, filterEvents, isFiltered } from "@/lib/stream-filter";

const ev = (id: string, kind: ThreatEvent["kind"], title: string, severity: Severity, countryCode: string | null = null, subtitle = ""): ThreatEvent => ({
  id, kind, time: "2026-10-24T10:00:00Z", title, subtitle, severity, countryCode, source: "s", url: null, ref: { type: kind, id },
});
const E = [
  ev("1", "ransomware", "qilin claims Acme Corp", "high", "US", "Manufacturing"),
  ev("2", "kev", "CVE-2024-3400 PAN-OS", "critical", null, "Palo Alto"),
  ev("3", "news", "Germany hit by phishing wave", "medium", "DE"),
  ev("4", "c2", "Emotet 1.2.3.4", "low", "NL"),
  ev("5", "cve", "CVE-2026-1111 low thing", "info"),
];
const all = (): boolean => true;
const ids = (f: Partial<typeof DEFAULT_FILTER>, layer: (e: ThreatEvent) => boolean = all) => filterEvents(E, { ...DEFAULT_FILTER, ...f }, layer).map((e) => e.id);

describe("filterEvents", () => {
  it("returns everything with no filter", () => expect(ids({})).toHaveLength(5));
  it("matches title, subtitle, CVE id and country name, case-insensitively", () => {
    expect(ids({ query: "QILIN" })).toEqual(["1"]);
    expect(ids({ query: "manufacturing" })).toEqual(["1"]);
    expect(ids({ query: "cve-2026-1111" })).toEqual(["5"]);
    expect(ids({ query: "germany" })).toEqual(["3"]);
  });
  it("ANDs multiple terms", () => {
    expect(ids({ query: "qilin acme" })).toEqual(["1"]);
    expect(ids({ query: "qilin emotet" })).toEqual([]);
  });
  it("treats regex characters literally", () => expect(ids({ query: "(.*)" })).toEqual([]));
  it("ignores a whitespace-only query", () => {
    expect(ids({ query: "   " })).toHaveLength(5);
    expect(isFiltered({ ...DEFAULT_FILTER, query: "  " })).toBe(false);
  });
  it("filters by minimum severity", () => {
    expect(ids({ minSeverity: "high" })).toEqual(["1", "2"]);
    expect(ids({ minSeverity: "critical" })).toEqual(["2"]);
  });
  it("filters by country and by layer", () => {
    expect(ids({ countryCode: "DE" })).toEqual(["3"]);
    expect(ids({}, (e) => e.kind !== "news")).toHaveLength(4);
  });
  it("sorts by severity, stably, without mutating the input", () => {
    const before = E.map((e) => e.id);
    expect(ids({ sort: "severity" })).toEqual(["2", "1", "3", "4", "5"]);
    expect(E.map((e) => e.id)).toEqual(before);
    const same = [ev("a", "news", "a", "high"), ev("b", "news", "b", "high"), ev("c", "news", "c", "high")];
    expect(filterEvents(same, { ...DEFAULT_FILTER, sort: "severity" }, all).map((e) => e.id)).toEqual(["a", "b", "c"]);
  });
  it("stays fast on 50,000 events", () => {
    const big = Array.from({ length: 50_000 }, (_, i) => ev("b" + i, "news", `headline number ${i} about ransomware`, "medium", "US"));
    const t = performance.now();
    filterEvents(big, { ...DEFAULT_FILTER, query: "headline ransomware 49999" }, all);
    expect(performance.now() - t).toBeLessThan(400);
  });
});
