import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import BackgroundFX from "@/components/ui/BackgroundFX";
import { SITE_URL, jsonLd } from "@/lib/seo";

const telegraf = localFont({
  src: [
    { path: "../fonts/Telegraf-Regular.woff", weight: "400", style: "normal" },
    { path: "../fonts/Telegraf-UltraBold.woff", weight: "800", style: "normal" },
  ],
  variable: "--font-telegraf",
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TRIADA Threat | Real-Time Global Cyber Threat Intelligence",
  description:
    "Live global cyber threat intelligence: ransomware leak-site claims, actively exploited vulnerabilities, new critical CVEs, botnet C2 servers and security news on an interactive 3D globe.",
  icons: { icon: "/images/favicon-64.png", apple: "/images/favicon-256.png" },
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  authors: [{ name: "TRIADA", url: "https://triada.in" }],
  openGraph: {
    type: "website",
    siteName: "TRIADA Threat",
    title: "TRIADA Threat | Real-Time Global Cyber Threat Intelligence",
    description: "Ransomware claims, exploited vulnerabilities, botnet C2 and security news on one live 3D globe.",
    images: [{ url: "/images/og.jpg", width: 1200, height: 630, alt: "TRIADA Threat: real-time global cyber threat map" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TRIADA Threat | Real-Time Global Cyber Threat Intelligence",
    description: "Ransomware claims, exploited vulnerabilities, botnet C2 and security news on one live 3D globe.",
    images: ["/images/og.jpg"],
  },
};

export const viewport: Viewport = { themeColor: "#07080b", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${telegraf.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@graph": [
                { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: "TRIADA", url: "https://triada.in", logo: `${SITE_URL}/images/favicon-256.png` },
                { "@type": "WebSite", "@id": `${SITE_URL}/#site`, name: "TRIADA Threat", url: SITE_URL, publisher: { "@id": `${SITE_URL}/#org` } },
              ],
            }),
          }}
        />
        <BackgroundFX />
        <div className="relative z-[1]">{children}</div>
      </body>
    </html>
  );
}
