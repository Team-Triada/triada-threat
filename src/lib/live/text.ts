// Upstream text (CISA, NVD, leak sites) is full of typographic dashes; the UI
// uses plain hyphens and commas instead.
export function plain(s: string): string;
export function plain(s: string | null | undefined): string | null;
export function plain(s: string | null | undefined): string | null {
  if (s == null) return null;
  return s.replace(/\s*[–—]\s*/g, " - ");
}
