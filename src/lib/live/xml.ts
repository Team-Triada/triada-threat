// Linear-time helpers for reading untrusted RSS/XML.
//
// The feeds are third-party. A broken or hostile one must not be able to stall
// the server, and backtracking regexes such as /<[^>]+>/ or /<item[\s\S]*?<\/item>/
// go quadratic on input with many opening markers and no closing ones (a few
// hundred KB is enough to block the event loop for tens of seconds). Everything
// here advances through the string with indexOf, so cost is proportional to size.

// ASCII-only lowercase. toLowerCase() can change string length for some Unicode
// characters, which would misalign indexes into the original string.
function asciiLower(s: string): string {
  return s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
}

// Index of "<name" followed by a delimiter (so "<item" does not match "<itemized").
function findOpen(lower: string, name: string, from: number): number {
  const open = `<${name}`;
  for (let i = lower.indexOf(open, from); i >= 0; i = lower.indexOf(open, i + 1)) {
    const c = lower.charCodeAt(i + open.length);
    if (c === 62 || c === 32 || c === 9 || c === 10 || c === 13 || c === 47) return i; // > space tab LF CR /
  }
  return -1;
}

export function splitItems(xml: string, max: number): string[] {
  const lower = asciiLower(xml);
  const out: string[] = [];
  let from = 0;
  while (out.length < max) {
    const s = findOpen(lower, "item", from);
    if (s < 0) break;
    const e = lower.indexOf("</item>", s);
    if (e < 0) break;
    out.push(xml.slice(s, e + 7));
    from = e + 7;
  }
  return out;
}

export function tagReader(block: string): (name: string) => string | null {
  const lower = asciiLower(block);
  return (name) => {
    const n = asciiLower(name);
    const s = findOpen(lower, n, 0);
    if (s < 0) return null;
    const gt = lower.indexOf(">", s);
    if (gt < 0) return null;
    if (lower.charCodeAt(gt - 1) === 47) return ""; // <tag/>
    const e = lower.indexOf(`</${n}>`, gt);
    return e < 0 ? null : block.slice(gt + 1, e);
  };
}

export function unwrapCdata(s: string): string {
  let out = "";
  let i = 0;
  for (;;) {
    const a = s.indexOf("<![CDATA[", i);
    if (a < 0) break;
    const b = s.indexOf("]]>", a + 9);
    if (b < 0) break;
    out += s.slice(i, a) + s.slice(a + 9, b);
    i = b + 3;
  }
  return out + s.slice(i);
}

// Drops <...> spans. Same result as .replace(/<[^>]+>/g, " ") without the
// backtracking: a "<" with no later ">" is kept as plain text.
export function stripTags(s: string): string {
  const lastGt = s.lastIndexOf(">");
  let out = "";
  let i = 0;
  for (;;) {
    const lt = s.indexOf("<", i);
    if (lt < 0 || lt > lastGt) break;
    const gt = s.indexOf(">", lt + 1);
    out += s.slice(i, lt);
    if (gt === lt + 1) out += s.slice(lt, gt + 1); // "<>" is not a tag
    else out += " ";
    i = gt + 1;
  }
  return out + s.slice(i);
}

// String.fromCodePoint throws on out-of-range values; a crafted "&#99999999;"
// would otherwise take the whole feed down.
export function codePoint(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return "";
  return String.fromCodePoint(n);
}
