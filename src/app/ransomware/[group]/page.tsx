import Link from "next/link";
import PageTop from "@/components/ui/PageTop";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchGroupProfile } from "@/lib/live/ransomware";
import { ago, groupOrigin } from "@/lib/live/analysis";
import { countryName } from "@/lib/countries";

export const revalidate = 600;

const NAME_RE = /^[a-z0-9 _.-]{1,60}$/;

export async function generateMetadata({ params }: { params: Promise<{ group: string }> }): Promise<Metadata> {
  const name = decodeURIComponent((await params).group).toLowerCase();
  if (!NAME_RE.test(name)) return { title: "Not found" };
  return {
    title: `${name} | Ransomware Group Profile`,
    description: `Live leak-site activity, targeted sectors and countries, TTPs and exploited vulnerabilities for the ${name} ransomware group.`,
  };
}

export default async function GroupPage({ params }: { params: Promise<{ group: string }> }) {
  const name = decodeURIComponent((await params).group).toLowerCase();
  if (!NAME_RE.test(name)) notFound();
  const p = await fetchGroupProfile(name);
  if (!p) notFound();
  const origin = groupOrigin(name);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10" style={{ maxWidth: 1180 }}>
        <PageTop />
        <Link href="/ransomware" className="text-sm text-cyan hover:underline w-fit">← All ransomware activity</Link>

        <header className="flex flex-col gap-3">
          <span className="section-label">Ransomware group</span>
          <h1 className="heading-hero capitalize" style={{ fontSize: "clamp(28px, 6vw, 48px)" }}>{p.name}</h1>
          <div className="flex flex-wrap gap-2">
            {p.totalVictims > 0 && <span className="pill-tag">{p.totalVictims.toLocaleString()} victims claimed</span>}
            {p.firstSeen && <span className="pill-tag">First seen {fmt(p.firstSeen)}</span>}
            {p.lastSeen && <span className="pill-tag">Last post {ago(p.lastSeen)}</span>}
            {p.leakSites > 0 && <span className="pill-tag">{p.leakSites} known site{p.leakSites === 1 ? "" : "s"}</span>}
            {origin?.countryCode && <span className="pill-tag">Assessed nexus: {countryName(origin.countryCode)}</span>}
          </div>
          {origin && <p className="text-xs text-[var(--muted-foreground)]">{origin.note}</p>}
        </header>

        {p.description && (
          <section className="card-surface p-5 sm:p-6">
            <h2 className="section-label">Profile</h2>
            <p className="mt-3 text-[#c8cdd5] leading-relaxed whitespace-pre-line">{p.description}</p>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <Tally title="Targeted sectors" rows={p.sectors} />
          <Tally title="Targeted countries" rows={p.countries.map(([c, n]) => [countryName(c), n] as [string, number])} />
        </section>

        {p.vulnerabilities.length > 0 && (
          <section className="card-surface p-5 sm:p-6">
            <h2 className="section-label">Vulnerabilities this group exploits</h2>
            <ul className="mt-3 flex flex-col divide-y divide-[var(--border)]">
              {p.vulnerabilities.map((v) => (
                <li key={v.cve} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
                  <Link href={`/cve/${v.cve}`} className="text-sm text-cyan hover:underline tabular-nums">{v.cve}</Link>
                  <span className="text-sm text-[#c8cdd5]">{productLabel(v.vendor, v.product)}</span>
                  {v.cvss !== null && <span className="ml-auto text-xs text-[var(--muted-foreground)] tabular-nums">CVSS {v.cvss.toFixed(1)}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {p.ttps.length > 0 && (
          <section className="card-surface p-5 sm:p-6">
            <h2 className="section-label">Tactics and techniques (MITRE ATT&CK)</h2>
            <dl className="mt-3 flex flex-col gap-4">
              {p.ttps.map((t) => (
                <div key={t.tactic}>
                  <dt className="text-sm text-[#e8eaed]">{t.tactic}</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {t.techniques.map((x) => (
                      <a
                        key={x.id}
                        href={`https://attack.mitre.org/techniques/${x.id.replace(".", "/")}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pill-tag hover:text-cyan transition-colors"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                      >
                        {x.id} · {x.name}
                      </a>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {p.tools.length > 0 && (
          <section className="card-surface p-5 sm:p-6">
            <h2 className="section-label">Tools observed</h2>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2">
              {p.tools.map((t) => (
                <div key={t.category}>
                  <dt className="text-sm text-[#e8eaed]">{t.category}</dt>
                  <dd className="mt-1 text-sm text-[#9aa1ab] leading-relaxed">{t.items.join(", ")}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="section-label">Most recent victims</h2>
          <ul className="flex flex-col gap-2">
            {p.recentVictims.map((v) => (
              <li key={v.id} className="card-surface cv-row px-4 py-3 sm:px-5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-[#e8eaed] min-w-0 break-words">{v.victim}</span>
                <span className="text-xs text-[var(--muted-foreground)]">{[v.sector, v.countryCode ? countryName(v.countryCode) : null].filter(Boolean).join(" · ")}</span>
                <span className="ml-auto text-xs text-[var(--muted-foreground)]">{ago(v.discoveredAt)}</span>
              </li>
            ))}
            {p.recentVictims.length === 0 && <li className="text-sm text-[var(--muted-foreground)]">No victim history available right now.</li>}
          </ul>
        </section>
      </main>
    </div>
  );
}

// Feeds often repeat the vendor inside the product name ("Apache Apache bRPC").
function productLabel(vendor: string | null, product: string | null): string {
  if (!product) return vendor ?? "";
  if (!vendor || product.toLowerCase().startsWith(vendor.toLowerCase())) return product;
  return `${vendor} ${product}`;
}

function Tally({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="card-surface p-5">
      <h2 className="section-label">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {rows.map(([k, n]) => (
          <li key={k} className="text-sm">
            <div className="flex justify-between gap-3 text-[#c8cdd5]">
              <span className="truncate">{k}</span>
              <span className="text-[var(--muted-foreground)] tabular-nums">{n}</span>
            </div>
            <div className="h-[3px] mt-1 rounded-full bg-[var(--muted)]">
              <div className="h-full rounded-full bg-[#ff8c3c]" style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="text-xs text-[var(--muted-foreground)]">No data.</li>}
      </ul>
    </div>
  );
}
