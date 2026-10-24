import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BackgroundFX from "@/components/ui/BackgroundFX";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TRIADA Threat | Real-Time Global Cyber Threat Intelligence",
  description:
    "Live global cyber threat intelligence: ransomware leak-site claims, actively exploited vulnerabilities, new critical CVEs, botnet C2 servers and security news on an interactive 3D globe.",
  icons: { icon: "/images/favicon.png" },
  metadataBase: new URL("https://threat.triada.in"),
};

export const viewport: Viewport = { themeColor: "#07080b", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased`}>
        <BackgroundFX />
        <div className="relative z-[1]">{children}</div>
      </body>
    </html>
  );
}
