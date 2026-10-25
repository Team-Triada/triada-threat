"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { EventKind, ThreatEvent } from "@/lib/domain/types";
import { LAYER_META, type LayerState } from "@/lib/layers";
import { SEVERITY_COLOR } from "@/lib/severity";
import { ago } from "@/lib/domain/analysis";
import { useNow } from "@/lib/use-threat-feed";
import { countryName } from "@/lib/countries";
import { DEFAULT_FILTER, filterEvents, isFiltered, type MinSeverity, type SortMode, type StreamFilter } from "@/lib/stream-filter";

const PAGE = 60;

const SEVERITY_CHIPS: { id: MinSeverity; label: string }[] = [
  { id: "all", label: "All" },
  { id: "high", label: "High+" },
  { id: "critical", label: "Critical" },
];

const chip = (on: boolean) =>
  `rounded-full border px-2.5 py-1 text-[11px] leading-none transition-colors ${on ? "border-[var(--triada-cyan)] text-white bg-[var(--muted)]" : "border-[var(--border-strong)] text-[var(--muted-foreground)] hover:text-white"}`;

const KIND_LABEL: Record<EventKind, string> = { ransomware: "RANSOMWARE", kev: "EXPLOITED", cve: "CVE", c2: "C2", scan: "SCANNER", news: "NEWS" };

export default function LiveStream({
  events,
  layers,
  newIds,
  selectedId,
  onSelect,
  loaded,
  filter,
  onFilterChange,
}: {
  events: ThreatEvent[];
  layers: LayerState;
  newIds: Set<string>;
  selectedId: string | null;
  onSelect: (e: ThreatEvent) => void;
  loaded: boolean;
  filter: StreamFilter;
  onFilterChange: (f: StreamFilter) => void;
}) {
  const now = useNow();
  // Typing stays instant; the list re-filters at lower priority.
  const deferredQuery = useDeferredValue(filter.query);
  const { minSeverity, countryCode, sort } = filter;
  const matching = useMemo(
    () => filterEvents(events, { query: deferredQuery, minSeverity, countryCode, sort }, (e) => layers[e.kind]),
    [events, layers, deferredQuery, minSeverity, countryCode, sort],
  );
  // The page size resets whenever the filter changes.
  const filterKey = `${deferredQuery}|${minSeverity}|${countryCode}|${sort}`;
  const [paging, setPaging] = useState({ key: filterKey, limit: PAGE });
  const limit = paging.key === filterKey ? paging.limit : PAGE;
  const shown = matching.slice(0, limit);
  const active = isFiltered(filter);
  const set = (patch: Partial<StreamFilter>) => onFilterChange({ ...filter, ...patch });

  return (
    <div className="card-surface pointer-events-auto flex flex-col overflow-hidden min-h-0 flex-1">
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between shrink-0">
        <span className="section-label" style={{ marginBottom: 0 }}>Live Threat Stream</span>
        <span className="text-[11px] text-[var(--muted-foreground)] tabular-nums">{matching.length} events</span>
      </div>
      <div className="px-4 pb-2.5 flex flex-col gap-2 shrink-0 border-b border-[var(--border)]">
        <div className="relative">
          <input
            type="search"
            value={filter.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder="Search CVE, group, victim, country…"
            aria-label="Search the live threat stream"
            autoComplete="off"
            spellCheck={false}
            maxLength={80}
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--muted)] px-3 py-2 text-[16px] sm:text-[13px] text-[#e8eaed] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--triada-cyan)]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div role="group" aria-label="Minimum severity" className="flex gap-1.5">
            {SEVERITY_CHIPS.map((c) => (
              <button key={c.id} aria-pressed={minSeverity === c.id} onClick={() => set({ minSeverity: c.id })} className={chip(minSeverity === c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <button
            aria-pressed={sort === "severity"}
            onClick={() => set({ sort: (sort === "newest" ? "severity" : "newest") satisfies SortMode })}
            className={`${chip(sort === "severity")} ml-auto`}
            title="Toggle between newest first and most severe first"
          >
            {sort === "severity" ? "Most severe" : "Newest"}
          </button>
        </div>
        {countryCode && (
          <div className="flex">
            <button onClick={() => set({ countryCode: null })} className={`${chip(true)} flex items-center gap-1.5`} aria-label={`Clear country filter ${countryName(countryCode)}`}>
              {countryName(countryCode)} <span aria-hidden>×</span>
            </button>
          </div>
        )}
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
        {matching.length > shown.length && (
          <li className="border-t border-[var(--border)] p-3">
            <button onClick={() => setPaging({ key: filterKey, limit: limit + PAGE })} className="w-full rounded-lg border border-[var(--border-strong)] py-2 text-[12px] text-[#c8cdd5] hover:text-white hover:border-[var(--triada-cyan)] transition-colors">
              Show more ({matching.length - shown.length} older)
            </button>
          </li>
        )}
        {loaded && shown.length === 0 && (
          <li className="px-4 py-6 text-xs text-[var(--muted-foreground)]">
            {active ? "No events match these filters." : "No events for the selected layers."}
            {active && (
              <button onClick={() => onFilterChange(DEFAULT_FILTER)} className="ml-2 text-cyan hover:underline">
                Clear filters
              </button>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}
