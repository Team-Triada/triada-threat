"use client";

import type { ThreatSnapshot } from "@/lib/live/types";
import { countryName } from "@/lib/countries";
import { ago } from "@/lib/live/analysis";
import { useNow } from "@/lib/use-threat-feed";
import Link from "next/link";

function Bars({ rows, color }: { rows: { label: string; count: number; href?: string; onClick?: () => void }[]; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <li key={r.label} className="text-xs">
          <div className="flex justify-between text-[#c8cdd5]">
            {r.href ? (
              <Link href={r.href} className="hover:text-cyan truncate capitalize">{r.label}</Link>
            ) : r.onClick ? (
              <button onClick={r.onClick} className="hover:text-cyan truncate text-left">{r.label}</button>
            ) : (
              <span className="truncate">{r.label}</span>
            )}
            <span className="tabular-nums text-[var(--muted-foreground)]">{r.count}</span>
          </div>
          <div className="h-[3px] rounded-full bg-[var(--muted)] mt-1">
            <div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function PulsePanel({ snapshot, onSelectCountry }: { snapshot: ThreatSnapshot; onSelectCountry: (code: string) => void }) {
  const now = useNow();
  return (
    <div className="card-surface pointer-events-auto flex flex-col gap-5 p-4 overflow-y-auto thin-scroll">
      <div>
        <span className="section-label">Most active gangs · last {snapshot.victims.length} claims</span>
        <div className="mt-2">
          <Bars color="#ff8c3c" rows={snapshot.topGroups.map((g) => ({ label: g.group, count: g.count, href: `/ransomware/${encodeURIComponent(g.group)}` }))} />
        </div>
      </div>
      <div>
        <span className="section-label">Most targeted countries</span>
        <div className="mt-2">
          <Bars color="#ff3c3c" rows={snapshot.topCountries.map((c) => ({ label: countryName(c.code), count: c.count, onClick: () => onSelectCountry(c.code) }))} />
        </div>
      </div>
      <div>
        <span className="section-label">Targeted sectors</span>
        <div className="mt-2">
          <Bars color="#ffcc3c" rows={snapshot.topSectors.map((s) => ({ label: s.sector, count: s.count }))} />
        </div>
      </div>
      <div>
        <span className="section-label">Data sources</span>
        <ul className="mt-2 flex flex-col gap-1">
          {snapshot.sources.map((s) => (
            <li key={s.name} className="flex items-center gap-2 text-[11px] text-[#9aa1ab]" title={s.error}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.ok ? "#3ddc84" : "#ff3c3c" }} />
              <span className="truncate">{s.name}</span>
              <span suppressHydrationWarning className="ml-auto tabular-nums text-[var(--muted-foreground)] shrink-0">
                {s.ok ? (s.newestAt ? `newest ${ago(s.newestAt, now)}` : `${s.count}`) : "error"}
              </span>
            </li>
          ))}
        </ul>
        <p suppressHydrationWarning className="mt-2 text-[11px] leading-snug text-[var(--muted-foreground)]">&quot;Newest&quot; is the age of the latest item each source has published. A quiet source is not a broken one. Dashboard fetched {ago(snapshot.generatedAt, now)}.</p>
      </div>
    </div>
  );
}
