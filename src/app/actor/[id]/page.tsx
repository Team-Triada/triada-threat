import Link from "next/link";
import PageTop from "@/components/ui/PageTop";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getActorById, getActors, getArticlesForActor } from "@/lib/actors";
import { fetchArticles } from "@/lib/live/feeds";
import { ago } from "@/lib/domain/analysis";
import { SeverityBadge, CategoryBadge } from "@/components/ui/Badges";

export const revalidate = 600;

export async function generateStaticParams() {
  return getActors().map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const actor = getActorById(id);
  if (!actor) return { title: "Not found" };
  return pageMeta({ title: `${actor.name} | Threat Actor Profile`, description: actor.description, path: `/actor/${actor.id}` });
}

export default async function ActorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = getActorById(id);
  if (!actor) notFound();

  const feed = await fetchArticles().catch(() => ({ articles: [], errors: [] }));
  const related = getArticlesForActor(actor, feed.articles);

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10" style={{ maxWidth: 1180 }}>
        <PageTop />
        <Link href="/" className="text-sm text-cyan hover:underline w-fit">
          ← Back to live map
        </Link>

        <header className="flex flex-col gap-4">
          <span className="section-label">{actor.attribution}</span>
          <h1 className="heading-hero" style={{ fontSize: "clamp(28px, 4vw, 48px)" }}>
            {actor.name}
          </h1>
          <div className="flex flex-wrap gap-1.5">
            {actor.aliases.map((a) => (
              <span key={a} className="pill-tag">{a}</span>
            ))}
          </div>
          <div className="text-sm text-[var(--muted-foreground)]">{actor.country}</div>
        </header>

        <section className="card-surface p-6 flex flex-col gap-5">
          <p className="text-[#c8cdd5] leading-relaxed">{actor.description}</p>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <span className="section-label">MITRE ATT&CK Techniques</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {actor.techniques.map((t) => (
                  <a
                    key={t}
                    href={`https://attack.mitre.org/techniques/${t.replace(".", "/")}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pill-tag hover:text-cyan hover:border-[var(--triada-cyan)] transition-colors"
                  >
                    {t}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <span className="section-label">Associated Malware</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {actor.malwareFamilies.map((m) => (
                  <span key={m} className="pill-tag">{m}</span>
                ))}
              </div>
            </div>
          </div>

          {actor.mitreUrl && (
            <a
              href={actor.mitreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan hover:underline text-sm w-fit"
            >
              Full MITRE ATT&CK profile →
            </a>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <span className="section-label">
            {related.length} recent {related.length === 1 ? "article mentions" : "articles mention"} this actor
          </span>
          {related.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">
              No recent coverage in the current feed. This actor may be quiet, or reporting hasn&apos;t used a matched alias.
            </p>
          )}
          <ul className="flex flex-col gap-4">
            {related.map((item) => (
              <li key={item.link} className="card-surface p-5">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <SeverityBadge severity={item.severity} />
                  {item.tags.map((c) => (
                    <CategoryBadge key={c} category={c} />
                  ))}
                </div>
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="heading-card block hover:text-cyan transition-colors">
                  {item.title}
                </a>
                <div className="mt-2 text-xs text-[var(--muted-foreground)]">{item.source} · {ago(item.publishedAt)}</div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
