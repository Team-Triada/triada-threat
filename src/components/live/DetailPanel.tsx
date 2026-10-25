"use client";

import type { ThreatEvent, ThreatSnapshot } from "@/lib/domain/types";
import CountryView from "./detail/CountryView";
import EventView from "./detail/EventView";

export type Selection = { type: "event"; event: ThreatEvent } | { type: "country"; code: string };

type PanelProps = { selection: Selection; snapshot: ThreatSnapshot; onClose: () => void; wide: boolean; onToggleWide: () => void };

export default function DetailPanel({ selection, snapshot, onClose, wide, onToggleWide }: PanelProps) {
  return (
    <aside
      aria-label="Details"
      className={`dash-detail absolute z-30 inset-x-0 bottom-0 top-[var(--hdr)] p-0 pointer-events-none flex xl:inset-x-auto xl:right-0 xl:p-4 xl:transition-[width] xl:duration-200 motion-reduce:transition-none ${wide ? "xl:w-[min(820px,58vw)]" : "xl:w-[400px]"}`}
    >
      {/* Desktop only: the panel grows leftwards over the globe. */}
      <button
        onClick={onToggleWide}
        aria-label={wide ? "Narrow details panel" : "Widen details panel"}
        aria-pressed={wide}
        title={wide ? "Narrow panel" : "Widen panel"}
        className="pointer-events-auto absolute left-0 top-1/2 z-10 hidden h-12 w-6 -translate-y-1/2 place-items-center rounded-md border border-[var(--border-strong)] bg-[rgba(12,13,17,0.96)] text-[var(--muted-foreground)] hover:text-white hover:border-[var(--triada-cyan)] transition-colors xl:grid"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={wide ? "" : "rotate-180"}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      <div className="card-surface @container pointer-events-auto flex flex-col w-full overflow-hidden">
        <div className="flex-1 overflow-y-auto thin-scroll">
          {selection.type === "country" ? (
            <CountryView code={selection.code} snapshot={snapshot} onClose={onClose} />
          ) : (
            <EventView event={selection.event} snapshot={snapshot} onClose={onClose} />
          )}
        </div>
      </div>
    </aside>
  );
}
