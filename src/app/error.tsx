"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-start justify-center gap-5 px-6">
      <span className="section-label">Something broke</span>
      <h1 className="heading-hero" style={{ fontSize: "clamp(28px, 6vw, 44px)" }}>Couldn&apos;t load this page</h1>
      <p className="text-sm text-[var(--muted-foreground)]">An upstream feed may be down. Try again in a moment.</p>
      <div className="flex gap-4 text-sm">
        <button onClick={reset} className="text-cyan hover:underline">Retry</button>
        <Link href="/" className="text-[#c8cdd5] hover:underline">Back to the live map</Link>
      </div>
    </main>
  );
}
