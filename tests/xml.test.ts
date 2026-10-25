import { describe, expect, it } from "vitest";
import { codePoint, splitItems, stripTags, tagReader, unwrapCdata } from "@/lib/live/xml";

describe("splitItems", () => {
  it("splits items and respects the cap", () => {
    expect(splitItems("<rss><item>a</item><item>b</item></rss>", 10)).toHaveLength(2);
    expect(splitItems("<item>1</item><item>2</item><item>3</item>", 2)).toHaveLength(2);
  });
  it("ignores look-alike tags, handles case and attributes, drops unclosed items", () => {
    expect(splitItems("<itemized>x</itemized><item>a</item>", 5)).toHaveLength(1);
    expect(splitItems("<ITEM>a</ITEM>", 5)).toHaveLength(1);
    expect(splitItems('<item rdf:about="x">a</item>', 5)).toHaveLength(1);
    expect(splitItems("<item>a", 5)).toHaveLength(0);
  });
});

describe("tagReader", () => {
  it("reads plain, namespaced and attributed tags", () => {
    expect(tagReader("<item><title>Hello</title></item>")("title")).toBe("Hello");
    expect(tagReader("<item><content:encoded><![CDATA[x]]></content:encoded></item>")("content:encoded")).toBe("<![CDATA[x]]>");
    expect(tagReader('<item><link rel="a">u</link></item>')("link")).toBe("u");
  });
  it("returns null for missing tags and never matches a longer tag name", () => {
    expect(tagReader("<item></item>")("title")).toBeNull();
    expect(tagReader("<item><linkage>x</linkage></item>")("link")).toBeNull();
  });
  it("treats a self-closing tag as empty", () => expect(tagReader("<item><title/></item>")("title")).toBe(""));
});

describe("unwrapCdata / stripTags / codePoint", () => {
  it("unwraps CDATA sections and leaves unclosed ones alone", () => {
    expect(unwrapCdata("a<![CDATA[<b>]]>c")).toBe("a<b>c");
    expect(unwrapCdata("<![CDATA[1]]><![CDATA[2]]>")).toBe("12");
    expect(unwrapCdata("a<![CDATA[b")).toBe("a<![CDATA[b");
  });
  it("strips tags like the regex it replaced", () => {
    const h = '<p class="x">Hi <a href="u">link</a> &amp; more</p>';
    expect(stripTags(h).replace(/\s+/g, " ").trim()).toBe(h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    // a "<" with no later ">" is text, not a tag
    expect(stripTags("1 < 2")).toBe("1 < 2");
    // and anything the old regex stripped, including odd spans, is stripped identically
    for (const odd of ["1 < 2 and 3 > 2", "a<>b", "<<a>>", "x<y", "<a href='>'>t</a>"])
      expect(stripTags(odd).replace(/\s+/g, " ").trim(), odd).toBe(odd.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  });
  it("rejects invalid code points instead of throwing", () => {
    for (const n of [99999999, 0xd800, -1, NaN]) expect(codePoint(n)).toBe("");
    expect(codePoint(65)).toBe("A");
    expect(codePoint(0x1f600)).toBe("\u{1F600}");
  });
});

describe("hostile input stays linear", () => {
  // The regexes these replaced took 20 to 46 seconds on inputs this size.
  it("handles 1 MB of unclosed markers quickly", () => {
    const N = 1024 * 1024, t = performance.now();
    splitItems("<item ".repeat(N / 6), 20);
    tagReader("<item>" + "<title>".repeat(N / 7))("title");
    unwrapCdata("<![CDATA[".repeat(N / 9));
    stripTags("<a ".repeat(N / 3));
    expect(performance.now() - t).toBeLessThan(500);
  });
});
