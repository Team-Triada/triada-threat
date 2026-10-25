// Helpers for untrusted upstream strings (leak-site victim names, feed links,
// third-party IP metadata).

const MAP: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// react-globe.gl renders tooltip labels with innerHTML, so anything that is
// not a compile-time constant must be escaped first.
export function esc(s: string | number | null | undefined): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => MAP[c]);
}

// Only http(s) links may reach an href/src; blocks javascript:, data:, etc.
export function safeUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    const url = new URL(u.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const V4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
// IPv6 in the forms upstreams actually send: 8 groups, or "::" compression, and
// an optional embedded IPv4 tail. Requires colons, so plain hex words never pass.
const V6 = /^(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$|^(?:[0-9a-f]{1,4}:){1,7}:$|^:(?::[0-9a-f]{1,4}){1,7}$|^(?:[0-9a-f]{1,4}:){1,6}(?::[0-9a-f]{1,4}){1,6}$|^::(?:ffff:)?(?:\d{1,3}\.){3}\d{1,3}$/i;

// Strict check: this value ends up in an upstream URL path and in tooltips.
export function isIp(s: string): boolean {
  return typeof s === "string" && s.length <= 45 && (V4.test(s) || (s.includes(":") && V6.test(s)));
}
