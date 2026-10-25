import type { ThreatSnapshot } from "@/lib/domain/types";
import { countryName } from "@/lib/countries";
import { ago, type Finding } from "@/lib/domain/analysis";
import { Findings } from "@/components/ui/Assessment";
import { Shell } from "./parts";

export default function CountryView({ code, snapshot, onClose }: { code: string; snapshot: ThreatSnapshot; onClose: () => void }) {
  const victims = snapshot.victims.filter((v) => v.countryCode === code);
  const c2 = snapshot.c2.filter((s) => s.countryCode === code && s.online);
  const coverage = snapshot.articles.filter((a) => a.countryCodes.includes(code)).slice(0, 8);
  const groups = new Map<string, number>();
  const sectors = new Map<string, number>();
  for (const v of victims) {
    groups.set(v.group, (groups.get(v.group) ?? 0) + 1);
    if (v.sector) sectors.set(v.sector, (sectors.get(v.sector) ?? 0) + 1);
  }
  const rank = (m: Map<string, number>) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k} (${n})`).join(", ");
  return (
    <Shell kind="COUNTRY" color="#ff8c3c" title={countryName(code)} onClose={onClose}>
      <Findings
        rows={[
          { label: "Ransomware victims in window", value: String(victims.length), tone: victims.length >= 8 ? "bad" : "warn" },
          ...(groups.size ? [{ label: "Active gangs here", value: rank(groups) } as Finding] : []),
          ...(sectors.size ? [{ label: "Most hit sectors", value: rank(sectors) } as Finding] : []),
          { label: "Botnet C2 servers hosted", value: String(c2.length), tone: c2.length ? "warn" : "neutral" },
          { label: "News stories naming this country", value: String(coverage.length), tone: coverage.length ? "warn" : "neutral" },
        ]}
      />
      {coverage.length > 0 && (
        <div>
          <span className="section-label">Recent coverage</span>
          <ul className="mt-2 flex flex-col divide-y divide-[var(--border)]">
            {coverage.map((a) => (
              <li key={a.id} className="py-2">
                <a href={a.link} target="_blank" rel="noopener noreferrer" className="text-[13px] leading-snug text-[#dde1e6] hover:text-cyan">{a.title}</a>
                <div className="text-[11px] text-[var(--muted-foreground)]">{a.source} · {ago(a.publishedAt)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <span className="section-label">Recent victims</span>
        <ul className="mt-2 flex flex-col divide-y divide-[var(--border)]">
          {victims.slice(0, 12).map((v) => (
            <li key={v.id} className="py-2">
              <div className="text-[13px] text-[#dde1e6]">{v.victim}</div>
              <div className="text-[11px] text-[var(--muted-foreground)]">{v.group} · {v.sector ?? "Unclassified"} · {ago(v.discoveredAt)}</div>
            </li>
          ))}
          {victims.length === 0 && <li className="py-2 text-xs text-[var(--muted-foreground)]">No claims in the current window.</li>}
        </ul>
      </div>
    </Shell>
  );
}
