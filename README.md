# TRIADA Threat

Real-time global cyber threat map. Ransomware leak-site claims, vulnerabilities known to be exploited, new critical CVEs, botnet command-and-control servers, mass scanners and security news, drawn on an interactive 3D globe with a live stream, stats and per-record analysis.

Live at <https://threat.triada.in> (planned domain).

## Quick start

```bash
npm install
cp .env.example .env     # optional: add your keys, see below
npm run dev              # http://localhost:3000
```

Requires Node 20.9 or newer.

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Unit tests (Vitest) in `tests/` |
| `npm run fetch:attack` | Re-download the MITRE ATT&CK group data in `data/` |

## Environment variables

All optional. The app runs without them, with less data. They are read on the server only and must never be prefixed with `NEXT_PUBLIC_`. On a host, set them in its environment settings: `.env` is git-ignored and not deployed.

| Variable | Used for | Without it |
|---|---|---|
| `RANSOMWARE_API_KEY` | ransomware.live Pro: victims, group profiles | Falls back to the public API (fewer fields) |
| `NVD_API_KEY` | NVD CVE lookups | About 5 requests per 30 s instead of 50 |
| `IPINFO_TOKEN` | Placing scanner IPs on the map (IPinfo Lite) | Scanner layer is empty |

## Data sources

| Layer | Source | Notes |
|---|---|---|
| Ransomware claims, group profiles | [ransomware.live](https://www.ransomware.live) | Claims are the gang's own statements |
| Exploited vulnerabilities | [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) | |
| New CVEs, CVSS | [NVD](https://nvd.nist.gov) | |
| Exploit likelihood | [FIRST EPSS](https://www.first.org/epss/) | |
| Botnet C2 servers | [abuse.ch Feodo Tracker](https://feodotracker.abuse.ch) | |
| Mass scanners | [SANS ISC DShield](https://isc.sans.edu) | |
| IP to country and network | [IPinfo Lite](https://ipinfo.io/lite) | Attribution is shown in the UI |
| News | 11 security RSS feeds | See `src/lib/live/feeds.ts` |
| Threat actors | [MITRE ATT&CK](https://attack.mitre.org) | Stored in `data/`, refreshed with `npm run fetch:attack` |
| Country shapes | Natural Earth 110m | Self-hosted in `public/geo/` |

Country of origin for gangs and actors (`data/ransomware-origin.json`, `data/actor-attribution.json`) is a hand-maintained, assessed link from public reporting. It is labelled as such in the UI and is not telemetry. All map dots are country-level.

## Architecture

```
src/
  app/                 Next.js App Router: pages, API route, sitemap, robots
    page.tsx             Dashboard (ISR, 60 s)
    api/threats/         Aggregated snapshot as JSON (polled by the dashboard)
    ransomware/          List, and [group] profile pages
    cve/[id]/            CVE detail (ISR)
    actors/, actor/[id]/ MITRE ATT&CK groups
  components/
    live/                Dashboard shell, stream, header, stats, insights, detail panel
      detail/            Detail views (event, country) and shared frame
    globe/               3D globe (react-globe.gl) and its pure geometry helpers
    ui/                  Shared presentational pieces (logo, badges, top bar, assessment)
  lib/
    domain/              Isomorphic: types and the analysis/scoring logic. Safe in the browser.
    live/                SERVER ONLY (import "server-only"): upstream clients, caching, snapshot
    ...                  Small shared helpers: countries, severity, layers, seo, html escaping
data/                  Static datasets (ATT&CK, attribution, centroids)
public/                Images and the self-hosted map shapes
scripts/               Maintenance scripts
tests/                 Unit tests for the pure logic (filter, feed parsing, scoring, validation)
.github/workflows/     CI: typecheck, lint, test, build, audit
```

Rules:

- Anything that touches an upstream API or an API key lives in `src/lib/live/` and starts with `import "server-only"`. Importing it from a client component fails the build, so keys cannot leak into the browser bundle.
- Browser code imports only from `src/lib/domain/` and the small shared helpers.
- Upstream text is untrusted: HTML is escaped (`lib/html.ts`), URLs are limited to http(s), IPs are validated before use, and RSS is read with linear-time helpers (`lib/live/xml.ts`) so a hostile feed cannot stall the server.

### Data flow and caching

1. `lib/live/snapshot.ts` calls every source in parallel, normalises the results into one `ThreatSnapshot`, and tracks each source's health.
2. Individual upstream calls are cached with Next's fetch cache (`next.revalidate`). Responses over 2 MB (CISA KEV) use `lib/live/memo.ts`, an in-process cache with in-flight de-duplication and stale-on-error.
3. The home page is rendered with a trimmed snapshot (ISR, 60 s). The browser then swaps in the full snapshot from `/api/threats` and polls it every 60 s.
4. CVE and ransomware group pages use on-demand ISR.

The in-process caches are per instance. On serverless hosts each cold start begins empty, so upstream request volume is higher there; the Next fetch cache still applies.

## Security notes

- Security headers and a Content Security Policy are set in `next.config.ts`. The CSP allows inline scripts because Next requires them.
- The image optimizer is limited to the logo (`images.localPatterns`).
- Single-CVE lookups are capped at 30 per minute so crawlers cannot exhaust the NVD quota.
- `/api/threats` has no rate limit of its own. Put a rate limit in front of it at the host.
- Source maps are published (Lighthouse uses them). Set `productionBrowserSourceMaps` to `false` in `next.config.ts` to stop that.

## Deployment

Needs a Node runtime (server routes, ISR, server-side keys), so it can't be a static export. Vercel works with no config: set the three env vars and add the domain. Cloudflare Workers needs the OpenNext adapter and a shared cache for the in-process caches.

## Accessibility and performance

One h1 per page, labelled controls, keyboard-friendly panels, reduced-motion support. On a production build Lighthouse gives 100 for Accessibility, Best Practices and SEO. Desktop performance is 98 to 100. Mobile varies between about 70 and 95 depending on machine load, mostly because of the globe code.

## Attribution

IP geolocation by [IPinfo](https://ipinfo.io). Map shapes from [Natural Earth](https://www.naturalearthdata.com). ATT&CK data from MITRE. Check each provider's terms before commercial use, in particular ransomware.live and NVD.
