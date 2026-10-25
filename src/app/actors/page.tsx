import Link from "next/link";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import PageTop from "@/components/ui/PageTop";
import { getActors, type ThreatActor } from "@/lib/actors";
import { FingerPrintIcon, GlobeAltIcon, QuestionMarkCircleIcon, UserGroupIcon } from "@heroicons/react/16/solid";
import StatTile from "@/components/ui/StatTile";

export const metadata: Metadata = pageMeta({
  title: "Threat Actors | MITRE ATT&CK Groups",
  description: "Intrusion sets from MITRE ATT&CK grouped by assessed country of origin, with TTPs, malware and live news coverage.",
  path: "/actors",
});

const PAGE = 24;

export default async function ActorsPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const { all } = await searchParams;
  const actors = getActors();
  const attributed = actors.filter((a) => a.countryCode);
  const rest = actors.filter((a) => !a.countryCode);

  // Attributed actors grouped by assessed country, biggest group first.
  const byCountry = new Map<string, ThreatActor[]>();
  for (const a of attributed) byCountry.set(a.country, [...(byCountry.get(a.country) ?? []), a]);
  const countries = Array.from(byCountry.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  const stats = [
    { label: "Intrusion sets", value: actors.length, color: "#ff8c3c", Icon: UserGroupIcon },
    { label: "Attributed", value: attributed.length, color: "#ffcc3c", Icon: FingerPrintIcon },
    { label: "Countries", value: countries.length, color: "#19d3c5", Icon: GlobeAltIcon },
    { label: "Unattributed", value: rest.length, color: "#c77dff", Icon: QuestionMarkCircleIcon },
  ];

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full flex-col gap-10 px-4 py-6 sm:px-8 sm:py-10" style={{ maxWidth: 1180 }}>
        <PageTop current="/actors" />

        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <span className="section-label">MITRE ATT&amp;CK</span>
            <h1 className="heading-hero" style={{ fontSize: "clamp(30px, 4.5vw, 48px)" }}>Threat Actors</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)]">
              {actors.length} intrusion sets with their techniques and malware. Origin is an assessed attribution from public reporting. Each actor page lists live news coverage matched by name or alias.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {stats.map((t) => (
              <StatTile key={t.label} {...t} />
            ))}
          </div>
          {countries.length > 0 && (
            <nav aria-label="Jump to country" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              {countries.map(([name, list]) => (
                <a key={name} href={`#${slug(name)}`} className="pill-tag shrink-0 whitespace-nowrap hover:text-white">
                  {name} <span className="ml-1.5 text-[var(--muted-foreground)] tabular-nums">{list.length}</span>
                </a>
              ))}
              {rest.length > 0 && (
                <a href="#unattributed" className="pill-tag shrink-0 whitespace-nowrap hover:text-white">Unattributed <span className="ml-1.5 text-[var(--muted-foreground)] tabular-nums">{rest.length}</span></a>
              )}
            </nav>
          )}
        </header>

        {countries.map(([name, list]) => (
          <Section key={name} id={slug(name)} title={name} count={list.length} actors={list} />
        ))}

        {rest.length > 0 && (
          <Section id="unattributed" title="Unattributed" count={rest.length} actors={all ? rest : rest.slice(0, PAGE)}>
            {!all && rest.length > PAGE && (
              <Link href="/actors?all=1#unattributed" prefetch={false} className="w-fit rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm text-[#c8cdd5] transition-colors hover:border-[var(--triada-cyan)] hover:text-white">
                Show all {rest.length} unattributed groups
              </Link>
            )}
          </Section>
        )}
      </main>
    </div>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function Section({ id, title, count, actors, children }: { id: string; title: string; count: number; actors: ThreatActor[]; children?: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="flex flex-col gap-3 scroll-mt-6">
      <div className="flex items-baseline gap-3 border-b border-[var(--border)] pb-2">
        <h2 id={`${id}-h`} className="heading-card" style={{ fontSize: 20 }}>{title}</h2>
        <span className="text-xs text-[var(--muted-foreground)] tabular-nums">{count} {count === 1 ? "group" : "groups"}</span>
      </div>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {actors.map((a) => (
          <li key={a.id} className="cv-row-card min-w-0">
            <Link href={`/actor/${a.id}`} prefetch={false} className="card-surface group flex h-full flex-col gap-1.5 px-4 py-3.5 transition-colors hover:border-[var(--triada-cyan)]">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[15px] text-[#f2f4f7] group-hover:text-cyan">{a.name}</span>
                <span className="shrink-0 text-[11px] text-[var(--muted-foreground)] tabular-nums">{a.mitreId}</span>
              </span>
              {a.aliases.length > 0 && <span className="truncate text-xs text-[var(--muted-foreground)]">aka {a.aliases.slice(0, 3).join(", ")}</span>}
              <span className="mt-auto pt-1 text-[11px] text-[#7d8591]">
                {a.techniques.length} techniques{a.malwareFamilies.length > 0 ? ` · ${a.malwareFamilies.length} malware` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}
