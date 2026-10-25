import "server-only";

const DAY = 86_400_000;

// Parses an RSS pubDate (RFC 822/2822, whose year may be 2 digits) or an ISO
// string. Returns null for anything unusable or implausible, so the caller can
// drop the item instead of stamping it "now" and scrambling the stream order.
export function parseFeedDate(raw: string, now = Date.now()): Date | null {
  const s = raw.trim();
  if (!s) return null;
  let d: Date;
  const m = s.match(/^(?:[A-Za-z]{3},\s*)?(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{2}|\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(.*)$/);
  if (m) {
    let year = Number(m[3]);
    if (m[3].length === 2) year += year < 70 ? 2000 : 1900; // RFC 822: 00-69 => 20xx, 70-99 => 19xx
    d = new Date(`${m[1]} ${m[2]} ${year} ${m[4]}:${m[5]}:${m[6] ?? "00"} ${m[7] || "GMT"}`);
  } else {
    d = new Date(s);
  }
  const t = d.getTime();
  if (Number.isNaN(t) || t < Date.UTC(2000, 0, 1) || t > now + DAY) return null;
  return d;
}
