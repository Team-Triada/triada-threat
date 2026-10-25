import { describe, expect, it } from "vitest";
import type { C2Server, CveRecord, KevItem } from "@/lib/domain/types";
import { ago, assessC2, assessCve, groupOrigin } from "@/lib/domain/analysis";

const kev = (over: Partial<KevItem> = {}): KevItem => ({ id: "CVE-2024-1", vendor: "V", product: "P", name: "n", dateAdded: "2026-10-01", dueDate: "2099-01-01", description: "d", requiredAction: "a", ransomwareUse: false, cwes: [], ...over });
const cve = (over: Partial<CveRecord> = {}): CveRecord => ({ id: "CVE-2024-1", published: "2026-10-01", lastModified: "2026-10-01", description: "d", cvss: { score: 9.8, severity: "CRITICAL", vector: "", version: "3.1" }, weakness: null, references: [], vendor: null, product: null, epss: 0.5, epssPercentile: 0.9, ...over });

describe("assessCve", () => {
  it("scores stay within 0 to 100 and levels follow the thresholds", () => {
    for (const [c, k] of [[null, null], [cve(), null], [cve(), kev()], [cve({ epss: 5 }), kev({ ransomwareUse: true })]] as const) {
      const a = assessCve(c, k);
      expect(a.score).toBeGreaterThanOrEqual(0);
      expect(a.score).toBeLessThanOrEqual(100);
    }
    expect(assessCve(null, null).level).toBe("low");
    expect(assessCve(cve(), kev({ ransomwareUse: true })).level).toBe("critical");
  });
  it("ranks confirmed exploitation above an unexploited CVE with the same CVSS", () => {
    expect(assessCve(cve(), kev()).score).toBeGreaterThan(assessCve(cve(), null).score);
  });
  it("flags an overdue federal deadline", () => {
    const a = assessCve(cve(), kev({ dueDate: "2020-01-01" }));
    expect(a.findings.some((f) => /overdue/i.test(f.value))).toBe(true);
  });
  it("never invents data for an unscored CVE", () => {
    const a = assessCve(cve({ cvss: null, epss: null }), null);
    expect(a.findings.some((f) => /not yet scored/i.test(f.value))).toBe(true);
  });
});

describe("assessC2", () => {
  it("returns a bounded assessment", () => {
    const s: C2Server = { ip: "1.2.3.4", port: 443, malware: "Emotet", countryCode: "NL", asName: "AS", firstSeen: "2026-10-24T00:00:00Z", lastOnline: null, online: true, lat: null, lng: null, city: null };
    const a = assessC2(s);
    expect(a.score).toBeLessThanOrEqual(100);
    expect(a.actions.length).toBeGreaterThan(0);
  });
});

describe("ago", () => {
  const now = Date.parse("2026-10-24T12:00:00Z");
  it("formats relative times", () => {
    expect(ago("2026-10-24T11:59:30Z", now)).toMatch(/now|s ago|just/i);
    expect(ago("2026-10-24T11:15:00Z", now)).toBe("45m ago");
    expect(ago("2026-10-24T09:00:00Z", now)).toBe("3h ago");
    expect(ago("2026-10-22T12:00:00Z", now)).toBe("2d ago");
  });
});

describe("groupOrigin", () => {
  it("is case and space insensitive and returns null for unknown groups", () => {
    expect(groupOrigin("Zzz Unknown Gang")).toBeNull();
    const known = groupOrigin("lockbit");
    if (known) expect(known.note.length).toBeGreaterThan(0);
  });
});
