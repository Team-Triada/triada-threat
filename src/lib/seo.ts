import type { Metadata } from "next";

// Public address of the site, used for canonical links, social cards, the sitemap and structured data.
// Set SITE_URL on the host (before the build) if you deploy somewhere else; no trailing slash.
export const SITE_URL = (process.env.SITE_URL || "https://threat.triada.in").replace(/\/+$/, "");
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

// Per-page metadata with canonical + social cards. Next replaces openGraph/twitter instead of
// merging, so each page repeats them with the image.
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

// schema.org BreadcrumbList: the one structured-data type that fits these pages
// (Google can show the trail in results). `path` is relative to SITE_URL.
export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: `${SITE_URL}${t.path}` })),
  };
}
