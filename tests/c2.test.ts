import { describe, expect, it } from "vitest";
import { isActive } from "@/lib/live/c2";

const NOW = Date.parse("2026-10-25T00:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString().slice(0, 10);

describe("isActive", () => {
  it("needs the online status", () => expect(isActive("offline", daysAgo(1), NOW)).toBe(false));
  it("accepts a server seen in the last 14 days", () => {
    expect(isActive("online", daysAgo(0), NOW)).toBe(true);
    expect(isActive("online", daysAgo(13), NOW)).toBe(true);
  });
  it("rejects an online server that has not been seen for a long time", () => {
    expect(isActive("online", daysAgo(15), NOW)).toBe(false);
    expect(isActive("online", daysAgo(227), NOW)).toBe(false);
  });
  it("keeps an online server with no sighting date, and rejects an unreadable one", () => {
    expect(isActive("online", null, NOW)).toBe(true);
    expect(isActive("online", "not a date", NOW)).toBe(false);
  });
});
