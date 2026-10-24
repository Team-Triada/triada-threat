import Link from "next/link";
import PageTop from "@/components/ui/PageTop";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { fetchKev } from "@/lib/live/kev";
import { fetchCve, NvdUnavailable } from "@/lib/live/nvd";
import { fetchEpss } from "@/lib/live/epss";
import { fetchArticles } from "@/lib/live/feeds";
import { articlesForCve, assessCve, ago } from "@/lib/live/analysis";
import { Actions, Findings, Gauge } from "@/components/live/DetailPanel";
import { KevBadge, RansomwareBadge } from "@/components/ui/Badges";

export const revalidate = 300;

// No pages are built ahead of time; an empty list opts the route into on-demand
// ISR, so each page is generated once per revalidate window and then cached.
export function generateStaticParams() {
  return [];
}

const CVE_RE = /^CVE-\d{4}-\d{4,7}$/;
// Reject IDs from impossible years before they cost an upstream lookup.
const validCve = (id: string) => CVE_RE.test(id) && +id.slice(4, 8) >= 1999 && +id.slice(4, 8) <= new Date().getFullYear() + 1;

async function load(id: string) {
  let unavailable = false;
  const [cve, kevAll, epss, feed] = await Promise.all([
    fetchCve(id).catch((e) => {
      if (!(e instanceof NvdUnavailable)) throw e;
      unavailable = true;
      return null;
    }),
    fetchKev().catch(() => []),
    fetchEpss([id]).catch(() => new Map()),
    fetchArticles().catch(() => ({ articles: [], errors: [] })),
  ]);
  const kev = kevAll.find((k) => k.id === id) ?? null;
  const e = epss.get(id);
  if (cve && e) {
    cve.epss = e.epss;
    cve.epssPercentile = e.percentile;
  }
  return { cve, kev, unavailable, related: articlesForCve(id, feed.articles) };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = (await params).id.toUpperCase();
  if (!validCve(id)) return { title: "Not found" };
  const { cve, kev } = await load(id);
  return pageMeta({
    title: `${id}${kev ? ": Actively Exploited" : ""}`,
    description: (kev?.description ?? cve?.description ?? id).slice(0, 200),
    path: `/cve/${id}`,
  });
}

export default async function CvePage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id.toUpperCase();
  if (!validCve(id)) notFound();
  const { cve, kev, unavailable, related } = await load(id);
  if (!cve && !kev) {
    // NVD could not be asked: fail this render instead of caching a false 404.
    // (A thrown error is never stored by ISR; the last good page keeps serving.)
    if (unavailable) throw new Error("CVE data temporarily unavailable");
    notFound();
  }

  const a = assessCve(cve, kev);
  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "n/a");

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10" style={{ maxWidth: 1180 }}>
        <PageTop />
        <Link href="/" className="text-sm text-cyan hover:underline w-fit">← Back to live map</Link>

        <header className="flex flex-col gap-4">
          <h1 className="heading-hero" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>{id}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {kev && <KevBadge />}
            {kev?.ransomwareUse && <RansomwareBadge />}
            {kev && <span className="text-sm text-[#c8cdd5]">{kev.name}</span>}
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[1fr_360px] items-start">
          <div className="flex flex-col gap-6">
            <div className="card-surface p-6 flex flex-col gap-4">
              <span className="section-label">Description</span>
              <p className="text-[#c8cdd5] leading-relaxed">{kev?.description ?? cve?.description}</p>
              {kev && cve?.description && <p className="text-sm text-[#9aa1ab] leading-relaxed">{cve.description}</p>}
              {cve?.cvss?.vector && (
                <div>
                  <span className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)] block">CVSS {cve.cvss.version} vector</span>
                  <code className="text-xs text-[#9aa1ab] break-all">{cve.cvss.vector}</code>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Meta label="Published" value={fmt(cve?.published)} />
                <Meta label="Last modified" value={fmt(cve?.lastModified)} />
                {kev && <Meta label="Added to KEV" value={fmt(kev.dateAdded)} />}
                {kev && <Meta label="Remediation due" value={fmt(kev.dueDate)} />}
              </div>
            </div>

            {cve && cve.references.length > 0 && (
              <div className="card-surface p-6">
                <span className="section-label">References</span>
                <ul className="mt-3 flex flex-col gap-2">
                  {cve.references.map((r) => (
                    <li key={r.url} className="flex flex-wrap items-baseline gap-2">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan hover:underline break-all">{r.url}</a>
                      {r.tags.slice(0, 3).map((t) => <span key={t} className="text-[10px] text-[var(--muted-foreground)]">{t}</span>)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <span className="section-label">{related.length} recent {related.length === 1 ? "article mentions" : "articles mention"} this CVE</span>
              <ul className="flex flex-col gap-3">
                {related.map((r) => (
                  <li key={r.id} className="card-surface p-4">
                    <a href={r.link} target="_blank" rel="noopener noreferrer" className="heading-card block hover:text-cyan transition-colors" style={{ fontSize: 16 }}>{r.title}</a>
                    <p className="mt-1.5 text-sm text-[#9aa1ab] line-clamp-3">{r.summary}</p>
                    <div className="mt-2 text-xs text-[var(--muted-foreground)]">{r.source} · {ago(r.publishedAt)}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card-surface p-4 flex flex-col gap-4">
            <Gauge a={a} />
            <Findings rows={a.findings} />
            <Actions items={a.actions} />
          </div>
        </section>
      </main>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)] block">{label}</span>
      <span className="text-sm text-[#e8eaed]">{value}</span>
    </div>
  );
}
