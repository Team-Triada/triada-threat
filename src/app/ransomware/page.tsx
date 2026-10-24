import Link from "next/link";
import Logo from "@/components/ui/Logo";
import type { Metadata } from "next";
import { fetchRecentVictims } from "@/lib/live/ransomware";
import { ago, groupOrigin } from "@/lib/live/analysis";
import { countryName } from "@/lib/countries";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Ransomware Activity | Live Leak-Site Tracker",
  description: "Latest ransomware gang leak-site postings, refreshed every two minutes from ransomware.live.",
};

export default async function RansomwarePage({ searchParams }: { searchParams: Promise<{ group?: string; sector?: string; all?: string }> }) {
  const { group, sector, all: showAll } = await searchParams;
  const all = await fetchRecentVictims().catch(() => []);
  const victims = all.filter((v) => (!group || v.group === group) && (!sector || v.sector === sector));

  const count = (key: (v: (typeof all)[number]) => string | null) => {
    const m = new Map<string, number>();
    for (const v of all) {
      const k = key(v);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  };
  const groups = count((v) => v.group).slice(0, 14);
  const sectors = count((v) => v.sector).slice(0, 10);

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full flex-col gap-8 px-4 py-10 sm:px-8 sm:py-16" style={{ maxWidth: 1100 }}>
        <Logo height={16} />
        <Link href="/" className="text-sm text-cyan hover:underline w-fit">← Back to live map</Link>
        <header className="flex flex-col gap-3">
          <h1 className="heading-hero" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>Ransomware Activity</h1>
          <p className="text-[var(--muted-foreground)] text-sm max-w-2xl">
            Victims as claimed on gang extortion sites, refreshed every two minutes. A claim means data was already stolen. Where shown, a gang&apos;s country is an assessed link from public law-enforcement and industry reporting, not telemetry.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <Link href="/ransomware" prefetch={false} className={`pill-tag shrink-0 whitespace-nowrap ${!group && !sector ? "border-[var(--border-strong)] text-white" : ""}`}>All</Link>
            {groups.map(([g, n]) => (
              <Link key={g} prefetch={false} href={`/ransomware?group=${encodeURIComponent(g)}`} className={`pill-tag shrink-0 whitespace-nowrap capitalize ${group === g ? "border-[var(--triada-cyan)] text-white" : ""}`}>
                {g} <span className="text-[var(--muted-foreground)] ml-1">×{n}</span>
              </Link>
            ))}
          </div>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {sectors.map(([s, n]) => (
              <Link key={s} prefetch={false} href={`/ransomware?sector=${encodeURIComponent(s)}`} className={`pill-tag shrink-0 whitespace-nowrap ${sector === s ? "border-[var(--triada-cyan)] text-white" : ""}`}>
                {s} <span className="text-[var(--muted-foreground)] ml-1">×{n}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <span className="section-label">{victims.length} victims{!showAll && victims.length > 30 ? " (showing the latest 30)" : ""}</span>
          <ul className="flex flex-col gap-3">
            {(showAll ? victims : victims.slice(0, 30)).map((v) => {
              const origin = groupOrigin(v.group);
              return (
                <li key={v.id} className="card-surface cv-row-card p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Link href={`/ransomware/${encodeURIComponent(v.group)}`} prefetch={false} className="pill-tag capitalize hover:text-cyan">{v.group}</Link>
                    {v.countryCode && <span className="pill-tag">{countryName(v.countryCode)}</span>}
                    {v.sector && <span className="pill-tag">{v.sector}</span>}
                    <span className="ml-auto text-xs text-[var(--muted-foreground)]">{ago(v.discoveredAt)}</span>
                  </div>
                  <h2 className="heading-card">{v.victim}</h2>
                  {v.description && <p className="mt-2 text-sm text-[#9aa1ab] line-clamp-3">{v.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted-foreground)]">
                    <span>{origin?.countryCode && `Gang nexus (assessed): ${origin.countryCode}: ${origin.note}`}</span>
                    {v.permalink && <a href={v.permalink} target="_blank" rel="noopener noreferrer" className="text-cyan hover:underline">Source record ↗</a>}
                  </div>
                </li>
              );
            })}
            {victims.length === 0 && <li className="text-sm text-[var(--muted-foreground)]">No records (or the upstream feed is unavailable).</li>}
          </ul>
          {!showAll && victims.length > 30 && (
            <Link
              href={`/ransomware?${new URLSearchParams({ ...(group ? { group } : {}), ...(sector ? { sector } : {}), all: "1" })}`}
              prefetch={false}
              className="w-fit rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm text-[#c8cdd5] hover:text-white hover:border-[var(--triada-cyan)] transition-colors"
            >
              Show all {victims.length} victims
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}
