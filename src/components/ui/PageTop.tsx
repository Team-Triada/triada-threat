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
      <nav aria-label="Sections" className="flex items-center gap-1 text-[13px]">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            prefetch={false}
            aria-current={current === n.href ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 transition-colors ${current === n.href ? "bg-[var(--muted)] text-white" : "text-[var(--muted-foreground)] hover:text-white"}`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
