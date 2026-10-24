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

export const isIp = (s: string) => /^[0-9a-f:.]{3,45}$/i.test(s);
