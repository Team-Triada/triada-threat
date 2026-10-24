import Image from "next/image";
import Link from "next/link";

// Brand wordmark (red T + white lettering) from triada.in. The source PNG is
// 2927x372; next/image serves a ~260px variant instead of the full file.
export default function Logo({ height = 22 }: { height?: number }) {
  const width = Math.round((height * 2927) / 372);
  return (
    <Link href="/" aria-label="TRIADA home" className="inline-flex items-center shrink-0">
      <Image
        src="/images/Triada_typo.png"
        alt="TRIADA"
        width={width}
        height={height}
        sizes={`${width}px`}
        priority
        className="max-[359px]:!h-3 max-[359px]:!w-auto"
        style={{ height, width: "auto" }}
      />
    </Link>
  );
}
