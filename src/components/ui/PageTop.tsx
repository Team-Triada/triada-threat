import Link from "next/link";
import Logo from "@/components/ui/Logo";

const NAV = [
  { href: "/", label: "Live map" },
  { href: "/ransomware", label: "Ransomware" },
  { href: "/actors", label: "Actors" },
];

// Shared top bar for the content pages: wordmark on the left, section links on the right.
export default function PageTop({ current }: { current?: "/ransomware" | "/actors" }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Logo height={16} />
      <nav aria-label="Sections" className="flex min-w-0 items-center gap-0.5 text-[12px] sm:gap-1 sm:text-[13px]">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            prefetch={false}
            aria-current={current === n.href ? "page" : undefined}
            className={`rounded-full px-2 py-1.5 transition-colors sm:px-3 ${n.href === "/" ? "max-[359px]:hidden" : ""} ${current === n.href ? "bg-[var(--muted)] text-white" : "text-[var(--muted-foreground)] hover:text-white"}`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
