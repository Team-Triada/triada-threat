import Link from "next/link";
import Dashboard from "@/components/live/Dashboard";
import { buildSnapshot } from "@/lib/live/snapshot";
import { slimSnapshot } from "@/lib/domain/slim";

// ISR: the HTML already holds a recent snapshot (no "Connecting..." flash) and is rebuilt
// at most once a minute. The browser then polls /api/threats.
export const revalidate = 60;

export default async function Home() {
  const full = await buildSnapshot().catch(() => null);
  const initial = full ? slimSnapshot(full) : null;
  const groups = (full?.topGroups ?? []).slice(0, 8);
  const exploited = [...(full?.kev ?? [])].sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)).slice(0, 8);
  return (
    <>
      <Dashboard initial={initial} />
      {/* Plain-text summary for crawlers and screen readers: the dashboard itself is a canvas. Links are out of the tab order so keyboard users do not land on invisible controls. */}
      <aside aria-label="About TRIADA Threat" className="sr-only">
        <h2>Live global cyber threat intelligence</h2>
        <p>
          TRIADA Threat maps ransomware leak-site claims, vulnerabilities known to be exploited in the wild, newly published critical CVEs, botnet command-and-control servers, mass scanners and security news onto an interactive 3D globe.
          Data comes from ransomware.live, CISA KEV, NVD, FIRST EPSS, abuse.ch, SANS ISC and security news feeds, and refreshes every minute.
        </p>
        {full && (
          <p>
            In the last 24 hours: {full.stats.victims24h} ransomware victims claimed by {full.stats.activeGroups24h} gangs, {full.stats.kevAdded7d} vulnerabilities added to CISA KEV in the past 7 days, {full.stats.critical24h} new critical CVEs, and {full.stats.c2Online} botnet C2 servers online.
          </p>
        )}
        <nav aria-label="Browse threat data">
          <ul>
            <li><Link href="/ransomware" tabIndex={-1}>Latest ransomware victims</Link></li>
            <li><Link href="/actors" tabIndex={-1}>Threat actors from MITRE ATT&amp;CK</Link></li>
            {groups.map((g) => (
              <li key={g.group}><Link href={`/ransomware/${encodeURIComponent(g.group.toLowerCase())}`} tabIndex={-1}>{g.group} ransomware group</Link></li>
            ))}
            {exploited.map((k) => (
              <li key={k.id}><Link href={`/cve/${k.id}`} tabIndex={-1}>{k.id}: {k.vendor} {k.product}</Link></li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
