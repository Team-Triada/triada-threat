import Link from "next/link";

// Brand wordmark (red T + white lettering) from triada.in. Local copy is the
// 2927x372 original; it is only ever rendered ~120px wide.
export default function Logo({ height = 22 }: { height?: number }) {
  return (
    <Link href="/" aria-label="TRIADA home" className="inline-flex items-center shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/Triada_typo.png" alt="TRIADA" height={height} className="max-[359px]:!h-3" style={{ height, width: "auto" }} />
    </Link>
  );
}
