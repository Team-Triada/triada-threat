import { describe, expect, it } from "vitest";
import { country, countryName, jitter } from "@/lib/countries";
import { breadcrumbLd, jsonLd, pageMeta, titleCase } from "@/lib/seo";

describe("seo helpers", () => {
  it("title-cases group names", () => {
    expect(titleCase("black basta")).toBe("Black Basta");
    expect(titleCase("lockbit5")).toBe("Lockbit5");
    expect(titleCase("")).toBe("");
  });
  it("jsonLd cannot close its script tag and round-trips", () => {
    const j = jsonLd({ a: "</script><script>alert(1)" });
    expect(j).not.toContain("<");
    expect(JSON.parse(j).a).toBe("</script><script>alert(1)");
  });
  it("pageMeta sets canonical and complete social cards", () => {
    const m = pageMeta({ title: "T", description: "D", path: "/x" });
    expect(m.alternates?.canonical).toBe("/x");
    expect((m.openGraph as { images: { width: number }[] }).images[0].width).toBe(1200);
    expect((m.twitter as { card: string }).card).toBe("summary_large_image");
  });
});

describe("breadcrumbLd", () => {
  it("numbers items from 1 and builds absolute URLs", () => {
    const b = breadcrumbLd([{ name: "Home", path: "/" }, { name: "Ransomware", path: "/ransomware" }]);
    expect(b["@type"]).toBe("BreadcrumbList");
    expect(b.itemListElement.map((i) => i.position)).toEqual([1, 2]);
    expect(b.itemListElement[1].item).toBe("https://threat.triada.in/ransomware");
  });
});

describe("countries", () => {
  it("looks up by code, case-insensitively", () => {
    expect(country("de")?.name).toBe("Germany");
    expect(country("XX")).toBeNull();
    expect(country(null)).toBeNull();
    expect(countryName(null)).toBe("Unknown");
    expect(countryName("ZZ")).toBe("ZZ");
  });
  it("jitter is deterministic and bounded", () => {
    expect(jitter("a", 1.5)).toBe(jitter("a", 1.5));
    for (let i = 0; i < 500; i++) expect(Math.abs(jitter("ip" + i, 1.5))).toBeLessThanOrEqual(1.5);
  });
});
