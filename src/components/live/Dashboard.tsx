"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import LiveHeader from "@/components/live/LiveHeader";
import LiveStream from "@/components/live/LiveStream";
import MapLegend from "@/components/live/MapLegend";
import StatsBar from "@/components/live/StatsBar";
import PulsePanel from "@/components/live/PulsePanel";
import DetailPanel, { type Selection } from "@/components/live/DetailPanel";
import { useThreatFeed } from "@/lib/use-threat-feed";
import { DEFAULT_FILTER, type StreamFilter } from "@/lib/stream-filter";
import { DEFAULT_LAYERS, type LayerState } from "@/lib/layers";
import { country } from "@/lib/countries";
import type { EventKind, ThreatEvent, ThreatSnapshot } from "@/lib/live/types";

const ThreatGlobe = dynamic(() => import("@/components/globe/ThreatGlobe"), { ssr: false });

export default function Dashboard({ initial }: { initial: ThreatSnapshot | null }) {
  const { snapshot, error, loading, newIds, nextAt, refresh } = useThreatFeed(initial);
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [tab, setTab] = useState<"stream" | "stats" | "insights">("stream");
  const [filter, setFilter] = useState<StreamFilter>(DEFAULT_FILTER);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);

  const toggle = (k: EventKind) => setLayers((p) => ({ ...p, [k]: !p[k] }));

  const focusCountry = (code: string | null) => {
    const c = country(code);
    if (c) setFocus({ lat: c.lat, lng: c.lng });
  };

  const selectCountry = useCallback((code: string) => {
    setSelection({ type: "country", code });
    setFilter((f) => ({ ...f, countryCode: code }));
    const c = country(code);
    if (c) setFocus({ lat: c.lat, lng: c.lng });
  }, []);

  const selectEvent = (event: ThreatEvent) => {
    setSelection({ type: "event", event });
    focusCountry(event.countryCode);
  };

  // The header wraps to a different number of rows at different widths, so
  // publish its measured height instead of guessing it in CSS.
  useEffect(() => {
    const header = document.getElementById("dash-header")?.firstElementChild as HTMLElement | null;
    if (!header) return;
    const root = document.documentElement;
    const apply = () => root.style.setProperty("--hdr", `${Math.ceil(header.getBoundingClientRect().height)}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(header);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--hdr");
    };
  }, []);

  const newsCounts = useMemo(() => {
    const out: Record<string, number> = {};
    const cutoff = new Date(snapshot?.generatedAt ?? 0).getTime() - 48 * 3600_000;
    for (const a of snapshot?.articles ?? []) {
      if (new Date(a.publishedAt).getTime() < cutoff) continue;
      for (const code of a.countryCodes) out[code] = (out[code] ?? 0) + 1;
    }
    return out;
  }, [snapshot]);

  // Escape closes the detail view.
  useEffect(() => {
    if (!selection) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelection(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection]);

  const fresh = useMemo(() => newIds, [newIds]);
  const selectedCode = selection ? (selection.type === "country" ? selection.code : selection.event.countryCode) : null;

  const tabs = [
    { id: "stream", label: "Live stream" },
    { id: "stats", label: "Stats" },
    { id: "insights", label: "Insights" },
  ] as const;

  // Below lg the three side panels become one tabbed bottom sheet. Each panel is
  // rendered once; only its wrapper classes change per breakpoint.
  return (
    <main className="dash-root relative w-screen h-[100dvh] overflow-hidden">
      <h1 className="sr-only">TRIADA live cyber threat map</h1>
      <p className="sr-only" aria-live="polite">{newIds.size ? `${newIds.size} new events in the live stream` : ""}</p>
      <ThreatGlobe
        victims={snapshot?.victims ?? []}
        c2={snapshot?.c2 ?? []}
        scanners={snapshot?.scanners ?? []}
        showRansomware={layers.ransomware}
        showC2={layers.c2}
        showScan={layers.scan}
        showNews={layers.news}
        newsCounts={newsCounts}
        freshIds={fresh}
        focus={focus}
        selectedCode={selectedCode}
        onSelectCountry={selectCountry}
      />

      <LiveHeader snapshot={snapshot} error={error} loading={loading} nextAt={nextAt} layers={layers} onToggle={toggle} onRefresh={refresh} />

      <div
        role="group"
        aria-label="Dashboard sections"
        className="dash-tabs xl:hidden border-t border-[var(--border-strong)] bg-[rgba(12,13,17,0.98)]"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            aria-controls={`panel-${t.id}`}
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`text-[12px] font-medium tracking-wide transition-colors ${tab === t.id ? "text-white border-b-2 border-[var(--triada-cyan)]" : "text-[var(--muted-foreground)]"}`}
          >
            {t.label}
            {t.id === "stream" && snapshot ? <span className="ml-1.5 text-[11px] tabular-nums text-[var(--muted-foreground)]">{snapshot.events.length}</span> : null}
          </button>
        ))}
      </div>

      <MapLegend />

      <StatsBar snapshot={snapshot} detailOpen={!!selection} className={tab === "stats" ? "" : "max-xl:hidden"} />

      <div
        id="panel-stream"
        aria-label="Live threat stream"
        className={`dash-panel absolute z-10 pointer-events-none flex flex-col p-3 bg-[rgba(12,13,17,0.98)] xl:bg-transparent xl:p-4 xl:inset-x-auto xl:left-0 xl:top-[var(--hdr)] xl:bottom-0 xl:h-auto xl:w-[360px] ${tab === "stream" ? "" : "max-xl:hidden"}`}
      >
        <LiveStream
          events={snapshot?.events ?? []}
          layers={layers}
          newIds={newIds}
          selectedId={selection?.type === "event" ? selection.event.id : null}
          onSelect={selectEvent}
          loaded={!!snapshot}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>

      {snapshot && (
        <>
          <section
            id="panel-insights"
            aria-label="Insights"
            className={`dash-panel absolute z-10 pointer-events-none flex flex-col p-3 bg-[rgba(12,13,17,0.98)] xl:bg-transparent xl:p-4 xl:inset-x-auto xl:right-0 xl:top-[var(--hdr)] xl:bottom-0 xl:h-auto xl:w-[360px] ${tab === "insights" ? "" : "max-xl:hidden"} ${selection ? "xl:hidden" : ""}`}
          >
            <PulsePanel snapshot={snapshot} onSelectCountry={selectCountry} />
          </section>
          {selection && <DetailPanel selection={selection} snapshot={snapshot} onClose={() => setSelection(null)} />}
        </>
      )}

      {error && !snapshot && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="card-surface p-5 text-sm text-[#c8cdd5] pointer-events-auto">Couldn&apos;t reach the live feed ({error}). Retrying…</div>
        </div>
      )}
    </main>
  );
}
