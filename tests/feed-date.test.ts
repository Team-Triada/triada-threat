import { describe, expect, it } from "vitest";
import { parseFeedDate } from "@/lib/live/feed-date";

const NOW = Date.parse("2026-10-24T12:00:00Z");
const iso = (s: string) => parseFeedDate(s, NOW)?.toISOString() ?? null;

describe("parseFeedDate", () => {
  it("parses RFC 822 dates with a 4-digit year", () => {
    expect(iso("Fri, 24 Oct 2026 08:30:00 GMT")).toBe("2026-10-24T08:30:00.000Z");
    expect(iso("24 Oct 2026 08:30 +0200")).toBe("2026-10-24T06:30:00.000Z");
  });
  it("reads a 2-digit year as 20xx and never mangles a 4-digit one", () => {
    expect(iso("Fri, 24 Oct 26 08:30:00 GMT")).toBe("2026-10-24T08:30:00.000Z");
    expect(iso("Fri, 24 Oct 2026 08:30:00 GMT")).not.toContain("2020");
  });
  it("parses ISO 8601", () => expect(iso("2026-10-24T08:30:00Z")).toBe("2026-10-24T08:30:00.000Z"));
  it("returns null instead of guessing for junk, empty, or ancient dates", () => {
    for (const bad of ["", "   ", "not a date", "Fri, 32 Foo 2026 99:99:99 GMT", "01 Jan 99 00:00:00 GMT"]) expect(iso(bad), bad).toBeNull();
  });
  it("rejects dates far in the future but allows a little clock skew", () => {
    expect(iso("Mon, 26 Oct 2026 12:00:00 GMT")).toBeNull();
    expect(iso("Sat, 24 Oct 2026 13:00:00 GMT")).not.toBeNull();
  });
});
