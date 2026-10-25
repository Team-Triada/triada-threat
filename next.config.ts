import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://images.ransomware.live",
  "media-src 'none'",
  "connect-src 'self'",
  "font-src 'self' data:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Lets phones/tablets on the same network load the dev server (otherwise Next blocks
  // /_next/* for non-localhost origins, so the page renders but never hydrates).
  allowedDevOrigins: ['10.*.*.*', '192.168.*.*', '172.*.*.*', '*.local'],
  poweredByHeader: false,
  // The image optimizer only ever serves the logo. No remote sources, and only
  // that one local path, which keeps the /_next/image attack surface minimal.
  images: { localPatterns: [{ pathname: '/images/Triada_typo.png' }], remotePatterns: [] },
  // Lets browsers and Lighthouse map the shipped bundle back to source.
  productionBrowserSourceMaps: true,
  // Inline the (small) stylesheet so it does not block first paint.
  experimental: { inlineCss: true },
  async headers() {
    const longCache = [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }];
    return [
      { source: '/geo/:path*', headers: longCache },
      { source: '/images/:path*', headers: longCache },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
