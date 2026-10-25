import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import BackgroundFX from "@/components/ui/BackgroundFX";
import { OG_IMAGES, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL, SOCIAL_DESCRIPTION, TWITTER_IMAGES, jsonLd } from "@/lib/seo";

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
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: { icon: "/images/favicon-64.png", apple: "/images/favicon-256.png" },
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  authors: [{ name: "TRIADA", url: "https://triada.in" }],
  openGraph: { type: "website", siteName: SITE_NAME, title: SITE_TITLE, description: SOCIAL_DESCRIPTION, images: OG_IMAGES },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SOCIAL_DESCRIPTION, images: TWITTER_IMAGES },
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
                { "@type": "WebSite", "@id": `${SITE_URL}/#site`, name: SITE_NAME, url: SITE_URL, publisher: { "@id": `${SITE_URL}/#org` } },
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
