import Link from "next/link";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import PageTop from "@/components/ui/PageTop";
import { fetchRecentVictims } from "@/lib/live/ransomware";
import { ago, groupOrigin } from "@/lib/domain/analysis";
import { countryName } from "@/lib/countries";
import { ArrowUpRightIcon, XMarkIcon } from "@heroicons/react/16/solid";

export const revalidate = 120;

export const metadata: Metadata = pageMeta({
  title: "Ransomware Activity | Live Leak-Site Tracker",
  description: "Latest ransomware gang leak-site postings, refreshed every two minutes from ransomware.live.",
  path: "/ransomware",
});

const PAGE = 30;
type Params = { group?: string; sector?: string; country?: string; all?: string };

export default async function RansomwarePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const showAll = params.all;
  const all = await fetchRecentVictims().catch(() => []);
  // Filter values come from the URL: honour only ones that exist in the data, so
  // a crafted link cannot put arbitrary text into the page.
  const known = (pick: (v: (typeof all)[number]) => string | null, v?: string) => (v && all.some((x) => pick(x) === v) ? v : undefined);
  const group = known((v) => v.group, params.group);
  const sector = known((v) => v.sector, params.sector);
  const country = known((v) => v.countryCode, params.country);
  const victims = all.filter((v) => (!group || v.group === group) && (!sector || v.sector === sector) && (!country || v.countryCode === country));

  const tally = (key: (v: (typeof all)[number]) => string | null) => {
    const m = new Map<string, number>();
    for (const v of all) {
      const k = key(v);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  };
  const groups = tally((v) => v.group);
  const sectors = tally((v) => v.sector);
  const countries = tally((v) => v.countryCode);

  const href = (next: Params) => {
    const q = new URLSearchParams();
    for (const [k, val] of Object.entries(next)) if (val) q.set(k, val);
    const s = q.toString();
    return s ? `/ransomware?${s}` : "/ransomware";
  };
  const active = [
    group && { label: group, clear: href({ sector, country }) },
    sector && { label: sector, clear: href({ group, country }) },
    country && { label: countryName(country), clear: href({ group, sector }) },
  ].filter(Boolean) as { label: string; clear: string }[];

  const shown = showAll ? victims : victims.slice(0, PAGE);
  const stats = [
    { label: "Claims in window", value: all.length.toLocaleString() },
    { label: "Active gangs", value: groups.length.toLocaleString() },
    { label: "Most active", value: groups[0]?.[0] ?? "n/a", cap: true },
    { label: "Top sector", value: sectors[0]?.[0] ?? "n/a" },
  ];

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10" style={{ maxWidth: 1180 }}>
        <PageTop current="/ransomware" />

        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <span className="section-label">Live leak-site tracker</span>
            <h1 className="heading-hero" style={{ fontSize: "clamp(30px, 4.5vw, 48px)" }}>Ransomware Activity</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)]">
              Victims as claimed on gang extortion sites, refreshed every two minutes. A claim means data was already stolen. Where shown, a gang&apos;s country is an assessed link from public law-enforcement and industry reporting, not telemetry.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="card-surface px-4 py-3 min-w-0">
                <dt className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">{s.label}</dt>
                <dd title={s.value} className={`mt-1 break-words text-[17px] sm:text-[22px] leading-tight font-semibold text-white tabular-nums ${s.cap ? "capitalize" : ""}`} style={{ fontFamily: "var(--font-telegraf), sans-serif" }}>
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <section aria-label="Victims" className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-3">
              <nav aria-label="Filter by sector" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                {sectors.slice(0, 10).map(([s, n]) => (
                  <Link key={s} prefetch={false} href={sector === s ? href({ group, country }) : href({ group, sector: s, country })} aria-current={sector === s ? "true" : undefined} className={`pill-tag shrink-0 whitespace-nowrap ${sector === s ? "border-[var(--triada-cyan)] text-white" : "hover:text-white"}`}>
                    {s} <span className="ml-1.5 text-[var(--muted-foreground)] tabular-nums">{n}</span>
                  </Link>
                ))}
              </nav>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="section-label" style={{ letterSpacing: "0.16em" }}>
                  {victims.length.toLocaleString()} {victims.length === 1 ? "victim" : "victims"}
                  {!showAll && victims.length > PAGE ? `, latest ${PAGE}` : ""}
                </span>
                {active.map((a) => (
                  <Link key={a.label} href={a.clear} prefetch={false} aria-label={`Remove filter ${a.label}`} className="pill-tag capitalize border-[var(--triada-cyan)] text-white" style={{ padding: "3px 10px", fontSize: 12 }}>
                    {a.label} <XMarkIcon className="ml-1.5 h-3 w-3 text-[var(--muted-foreground)]" aria-hidden />
                  </Link>
                ))}
                {active.length > 1 && (
                  <Link href="/ransomware" prefetch={false} className="text-xs text-cyan hover:underline">Clear all</Link>
                )}
              </div>
            </div>

            <ul className="flex flex-col gap-2.5">
              {shown.map((v) => {
                const origin = groupOrigin(v.group);
                return (
                  <li key={v.id} className="card-surface cv-row-card border-l-2 border-l-[#ff8c3c] px-4 py-3.5 sm:px-5 sm:py-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="heading-card min-w-0 break-words" style={{ fontSize: 17 }}>{v.victim}</h2>
                      <span className="shrink-0 pt-0.5 text-xs text-[var(--muted-foreground)] tabular-nums">{ago(v.discoveredAt)}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--muted-foreground)]">
                      <Link href={`/ransomware/${encodeURIComponent(v.group)}`} prefetch={false} className="font-medium capitalize text-[#ffb070] hover:underline">{v.group}</Link>
                      {v.countryCode && (<><span aria-hidden>·</span><Link href={href({ group, sector, country: v.countryCode })} prefetch={false} className="hover:text-white">{countryName(v.countryCode)}</Link></>)}
                      {v.sector && (<><span aria-hidden>·</span><span>{v.sector}</span></>)}
                    </div>
                    {v.description && <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[#9aa1ab]">{v.description}</p>}
                    {(origin?.countryCode || v.permalink) && (
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-[var(--muted-foreground)]">
                        <span>{origin?.countryCode ? `Assessed gang nexus: ${countryName(origin.countryCode)}` : ""}</span>
                        {v.permalink && <a href={v.permalink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan hover:underline">Source record<ArrowUpRightIcon className="h-3 w-3" aria-hidden /></a>}
                      </div>
                    )}
                  </li>
                );
              })}
              {victims.length === 0 && (
                <li className="card-surface px-5 py-8 text-center text-sm text-[var(--muted-foreground)]">
                  No records match.{" "}
                  <Link href="/ransomware" prefetch={false} className="text-cyan hover:underline">Clear filters</Link>
                </li>
              )}
            </ul>
            {!showAll && victims.length > PAGE && (
              <Link
                href={`${href({ group, sector, country })}${active.length ? "&" : "?"}all=1`}
                prefetch={false}
                className="w-fit rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm text-[#c8cdd5] transition-colors hover:border-[var(--triada-cyan)] hover:text-white"
              >
                Show all {victims.length} victims
              </Link>
            )}
          </section>

          <aside aria-label="Breakdowns" className="flex flex-col gap-4 lg:sticky lg:top-6">
            <Breakdown title="Most active gangs" color="#ff8c3c" rows={groups.slice(0, 8).map(([k, n]) => ({ key: k, label: k, n, href: group === k ? href({ sector, country }) : href({ group: k, sector, country }), on: group === k, cap: true }))} />
            <Breakdown title="Most targeted countries" color="#ff3c3c" rows={countries.slice(0, 8).map(([k, n]) => ({ key: k, label: countryName(k), n, href: country === k ? href({ group, sector }) : href({ group, sector, country: k }), on: country === k }))} />
          </aside>
        </div>
      </main>
    </div>
  );
}

function Breakdown({ title, color, rows }: { title: string; color: string; rows: { key: string; label: string; n: number; href: string; on: boolean; cap?: boolean }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <section className="card-surface p-4">
      <h2 className="section-label" style={{ letterSpacing: "0.16em" }}>{title}</h2>
      <ul className="mt-3 flex flex-col gap-1">
        {rows.map((r) => (
          <li key={r.key}>
            <Link href={r.href} prefetch={false} aria-current={r.on ? "true" : undefined} className={`block rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--muted)] ${r.on ? "bg-[var(--muted)]" : ""}`}>
              <span className="flex justify-between gap-3 text-[13px] text-[#c8cdd5]">
                <span className={`truncate ${r.cap ? "capitalize" : ""} ${r.on ? "text-white" : ""}`}>{r.label}</span>
                <span className="tabular-nums text-[var(--muted-foreground)]">{r.n}</span>
              </span>
              <span className="mt-1 block h-[3px] rounded-full bg-[var(--muted)]">
                <span className="block h-full rounded-full" style={{ width: `${(r.n / max) * 100}%`, background: color }} />
              </span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="text-xs text-[var(--muted-foreground)]">No data.</li>}
      </ul>
    </section>
  );
}
