import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { ArrowLeftIcon } from "@heroicons/react/16/solid";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-start justify-center gap-5 px-6">
      <Logo height={16} />
      <span className="section-label">Error 404</span>
      <h1 className="heading-hero" style={{ fontSize: "clamp(28px, 6vw, 44px)" }}>Nothing here</h1>
      <p className="text-sm text-[var(--muted-foreground)]">That page doesn&apos;t exist, or the record has dropped out of the live feeds.</p>
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cyan hover:underline"><ArrowLeftIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />Back to the live map</Link>
    </main>
  );
}
