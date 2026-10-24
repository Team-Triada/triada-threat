import Link from "next/link";
import Logo from "@/components/ui/Logo";
import type { Metadata } from "next";
import { getActors } from "@/lib/actors";

export const metadata: Metadata = { title: "Threat Actors | MITRE ATT&CK Groups" };

export default function ActorsPage() {
  const actors = getActors();
  const attributed = actors.filter((a) => a.countryCode);
  const rest = actors.filter((a) => !a.countryCode);
  const Row = ({ a }: { a: (typeof actors)[number] }) => (
    <li>
      <Link href={`/actor/${a.id}`} className="card-surface flex items-center justify-between gap-3 px-4 py-3 hover:text-cyan transition-colors">
        <span className="truncate">{a.name}</span>
        <span className="text-xs text-[var(--muted-foreground)] shrink-0">{a.country}</span>
      </Link>
    </li>
  );
  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full flex-col gap-8 px-4 py-10 sm:px-8 sm:py-16" style={{ maxWidth: 1000 }}>
        <Logo height={16} />
        <Link href="/" className="text-sm text-cyan hover:underline w-fit">← Back to live map</Link>
        <h1 className="heading-hero" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>Threat Actors</h1>
        <p className="text-sm text-[var(--muted-foreground)] max-w-2xl">
          {actors.length} intrusion sets from MITRE ATT&CK with TTPs and malware. Each actor page lists live news coverage matched by name or alias.
        </p>
        <span className="section-label">Attributed ({attributed.length})</span>
        <ul className="grid gap-2 sm:grid-cols-2">{attributed.map((a) => <Row key={a.id} a={a} />)}</ul>
        <span className="section-label">Unattributed ({rest.length})</span>
        <ul className="grid gap-2 sm:grid-cols-2">{rest.map((a) => <Row key={a.id} a={a} />)}</ul>
      </main>
    </div>
  );
}
