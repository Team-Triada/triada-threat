import { SEVERITY_COLOR, SEVERITY_LABEL } from "@/lib/severity";
import type { Assessment, Finding } from "@/lib/domain/analysis";

const TONE: Record<NonNullable<Finding["tone"]>, string> = { bad: "#ff6b6b", warn: "#ffb347", ok: "#3ddc84", neutral: "#c8cdd5" };

export function Gauge({ a }: { a: Assessment }) {
  const color = SEVERITY_COLOR[a.level];
  return (
    <div className="rounded-lg border border-[var(--border)] p-3 flex gap-3 items-center" style={{ background: `${color}0d` }}>
      <div className="relative w-14 h-14 shrink-0">
        <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(a.score / 100) * 97.4} 97.4`} />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums">{a.score}</div>
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-widest" style={{ color }}>Risk assessment · {SEVERITY_LABEL[a.level]}</div>
        <p className="text-[13px] leading-snug text-[#e8eaed] mt-0.5">{a.headline}</p>
      </div>
    </div>
  );
}

export function Findings({ rows }: { rows: Finding[] }) {
  return (
    <dl className="flex flex-col divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col gap-0.5 px-3 py-2">
          <dt className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">{r.label}</dt>
          <dd className="text-[13px] break-words" style={{ color: TONE[r.tone ?? "neutral"] }}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Actions({ items }: { items: string[] }) {
  return (
    <div>
      <span className="section-label">Recommended actions</span>
      <ol className="mt-2 flex flex-col gap-2">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-[#c8cdd5]">
            <span className="text-cyan tabular-nums shrink-0">{i + 1}.</span>
            {t}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] text-[var(--muted-foreground)]">Assessment is derived automatically from the live signals above; verify against your own asset inventory.</p>
    </div>
  );
}
