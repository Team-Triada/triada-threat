"use client";

import type { EventKind, ThreatEvent } from "@/lib/live/types";
import { LAYER_META, type LayerState } from "@/lib/layers";
import { SEVERITY_COLOR } from "@/lib/severity";
import { ago } from "@/lib/live/analysis";
import { useNow } from "@/lib/use-threat-feed";

const KIND_LABEL: Record<EventKind, string> = { ransomware: "RANSOMWARE", kev: "EXPLOITED", cve: "CVE", c2: "C2", scan: "SCANNER", news: "NEWS" };

export default function LiveStream({
  events,
  layers,
  newIds,
  selectedId,
  onSelect,
  loaded,
}: {
  events: ThreatEvent[];
  layers: LayerState;
  newIds: Set<string>;
  selectedId: string | null;
  onSelect: (e: ThreatEvent) => void;
  loaded: boolean;
}) {
  const now = useNow();
  const shown = events.filter((e) => layers[e.kind]);

  return (
    <div className="card-surface pointer-events-auto flex flex-col overflow-hidden min-h-0 flex-1">
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between shrink-0">
        <span className="section-label" style={{ marginBottom: 0 }}>Live Threat Stream</span>
        <span className="text-[11px] text-[var(--muted-foreground)] tabular-nums">{shown.length} events</span>
      </div>
      <ul className="flex flex-col overflow-y-auto thin-scroll">
        {!loaded && <li className="px-4 py-6 text-xs text-[var(--muted-foreground)]">Pulling live feeds…</li>}
        {shown.map((e) => {
          const color = SEVERITY_COLOR[e.severity];
          const fresh = newIds.has(e.id);
          return (
            <li key={e.id} className="border-t border-[var(--border)] first:border-t-0">
              <button
                onClick={() => onSelect(e)}
                className={`w-full text-left flex items-start gap-3 px-4 py-2.5 hover:bg-[var(--muted)] transition-colors ${selectedId === e.id ? "bg-[var(--muted)]" : ""} ${fresh ? "flash-new" : ""}`}
              >
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider" style={{ color: LAYER_META[e.kind].color }}>
                    {KIND_LABEL[e.kind]}
                    {fresh && <span className="text-[#3ddc84]">· NEW</span>}
                    <span suppressHydrationWarning className="ml-auto font-normal text-[var(--muted-foreground)] tracking-normal">{e.kind === "scan" ? "today" : ago(e.time, now)}</span>
                  </div>
                  <div className="text-[13px] leading-snug text-[#dde1e6] line-clamp-2 mt-0.5">{e.title}</div>
                  <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)] truncate">{e.subtitle}</div>
                </div>
              </button>
            </li>
          );
        })}
        {loaded && shown.length === 0 && <li className="px-4 py-6 text-xs text-[var(--muted-foreground)]">No events for the selected layers.</li>}
      </ul>
    </div>
  );
}
