import type { Metadata } from "next";

export const SITE_URL = "https://threat.triada.in";
export const SITE_NAME = "TRIADA Threat";
export const SITE_TITLE = "TRIADA Threat | Real-Time Global Cyber Threat Intelligence";
export const SITE_DESCRIPTION =
  "Live global cyber threat intelligence: ransomware leak-site claims, actively exploited vulnerabilities, new critical CVEs, botnet C2 servers and security news on an interactive 3D globe.";
export const SOCIAL_DESCRIPTION = "Ransomware claims, exploited vulnerabilities, botnet C2 and security news on one live 3D globe.";
const OG_IMAGE = { url: "/images/og.jpg", width: 1200, height: 630, alt: "TRIADA Threat: real-time global cyber threat map" };

export function titleCase(s: string): string {
  return s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

export const OG_IMAGES = [OG_IMAGE];
export const TWITTER_IMAGES = [OG_IMAGE.url];

// Per-page metadata with a canonical URL and matching social cards. Next
// replaces (not merges) openGraph/twitter objects, so each page restates them
// including the image.
export function pageMeta({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "TRIADA Threat", title, description, url: path, images: OG_IMAGES },
    twitter: { card: "summary_large_image", title, description, images: TWITTER_IMAGES },
  };
}

// JSON-LD must not be able to close its own <script> tag.
export function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
