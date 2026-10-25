// Upstream text (CISA, NVD, leak sites) is full of typographic dashes; the UI
// uses plain hyphens and commas instead.
import "server-only";
export function plain(s: string): string;
export function plain(s: string | null | undefined): string | null;
export function plain(s: string | null | undefined): string | null {
  if (s == null) return null;
  // No \s*-around-the-dash pattern here: it backtracks quadratically on long whitespace runs.
  return s.replace(/[–—]/g, " - ").replace(/ {2,}/g, " ");
}
