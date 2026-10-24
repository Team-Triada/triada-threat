import type { Metadata } from "next";

export const SITE_URL = "https://threat.triada.in";
export const OG_IMAGE = { url: "/images/og.jpg", width: 1200, height: 630, alt: "TRIADA Threat: real-time global cyber threat map" };

export function titleCase(s: string): string {
  return s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

// Per-page metadata with a canonical URL and matching social cards. Next
// replaces (not merges) openGraph/twitter objects, so each page restates them
// including the image.
export function pageMeta({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "TRIADA Threat", title, description, url: path, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}

// JSON-LD must not be able to close its own <script> tag.
export function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
