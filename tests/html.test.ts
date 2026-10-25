import { describe, expect, it } from "vitest";
import { esc, isIp, safeUrl } from "@/lib/html";

describe("safeUrl", () => {
  it("allows http and https only", () => {
    expect(safeUrl("https://a.com/x")).toBe("https://a.com/x");
    expect(safeUrl("http://a.com")).toBeTruthy();
    for (const u of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", "file:///etc/passwd", "vbscript:x", "//evil.com", "  javascript:alert(1)", "", null, undefined])
      expect(safeUrl(u as string)).toBeNull();
  });
});

describe("esc", () => {
  it("escapes every HTML special", () => expect(esc(`<a href="x" onclick='y'>&</a>`)).toBe("&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;"));
  it("handles null and numbers", () => {
    expect(esc(null)).toBe("");
    expect(esc(5)).toBe("5");
  });
});

describe("isIp", () => {
  it("accepts IPv4 and IPv6", () => {
    for (const ip of ["8.8.8.8", "0.0.0.0", "255.255.255.255", "2001:4860:4860::8888", "::1", "fe80::1", "::ffff:1.2.3.4", "1:2:3:4:5:6:7:8"]) expect(isIp(ip), ip).toBe(true);
  });
  it("rejects anything that is not an address", () => {
    for (const ip of ["", "abc", "dead", "1.2.3", "1.2.3.4/../x", "1.2.3.4 ", "<script>", "999.1.1.1", "1.2.3.4.5", "01.2.3.4", "1.2.3.256", "a:b", "1:2:3:4:5:6:7:8:9", "::g", "1.2.3.4:80", "a::b::c", ":::"])
      expect(isIp(ip), JSON.stringify(ip)).toBe(false);
  });
});
