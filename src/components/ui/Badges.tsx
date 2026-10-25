import type { Severity } from "@/lib/domain/types";
import { SEVERITY_COLOR, SEVERITY_LABEL } from "@/lib/severity";

export function SeverityBadge({ severity }: { severity: Severity }) {
  const color = SEVERITY_COLOR[severity];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide leading-none"
      style={{ color, background: `${color}1f`, border: `1px solid ${color}4d` }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] leading-none text-[#9aa1ab] border border-[var(--border)]">
      {category}
    </span>
  );
}

export function KevBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide leading-none text-[#ff3c3c] bg-[rgba(255,60,60,0.12)] border border-[rgba(255,60,60,0.35)]">
      KEV
    </span>
  );
}

export function RansomwareBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide leading-none text-[#ff8c3c] bg-[rgba(255,140,60,0.12)] border border-[rgba(255,140,60,0.35)]">
      Ransomware Use
    </span>
  );
}
