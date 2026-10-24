"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import type { EventKind, ThreatSnapshot } from "@/lib/live/types";
import { LAYER_META, type LayerState } from "@/lib/layers";
import { useNow } from "@/lib/use-threat-feed";

export default function LiveHeader({
  snapshot,
  error,
  loading,
  nextAt,
  layers,
  onToggle,
  onRefresh,
}: {
  snapshot: ThreatSnapshot | null;
  error: string | null;
  loading: boolean;
  nextAt: number;
  layers: LayerState;
  onToggle: (k: EventKind) => void;
  onRefresh: () => void;
}) {
  const now = useNow(1000);
  const secs = Math.max(0, Math.round((nextAt - now) / 1000));
  const failing = snapshot?.sources.filter((x) => !x.ok).length ?? 0;
  const ok = !error && failing === 0;

  const status = (
          <button
              onClick={onRefresh}
              title={error ?? (failing ? `${failing} source(s) failing` : "All sources healthy. Click to refresh now")}
              className="pill-tag flex items-center gap-2 hover:border-[var(--border-strong)] transition-colors whitespace-nowrap"
              style={{ padding: "5px 10px" }}
            >
              <span className="relative flex w-2 h-2">
                {ok && <span className="absolute inline-flex w-full h-full rounded-full bg-[#3ddc84] opacity-60 motion-safe:animate-ping" />}
                <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: error ? "#ff3c3c" : ok ? "#3ddc84" : "#ffcc3c" }} />
              </span>
              {error ? "Offline" : snapshot ? (loading ? "Updating..." : (
                  <span>
                    <span className="max-[359px]:hidden">Live</span><span className="hidden sm:inline"> · refresh in {secs}s</span>
                    <span className="sm:hidden max-[359px]:hidden"> · {secs}s</span>
                  </span>
                )) : "Connecting..."}
            <span className="sr-only">, refresh now</span>
            </button>
  );

  return (
    <header id="dash-header" className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-1.5 xl:grid xl:grid-cols-[auto_1fr_auto] xl:gap-4 xl:px-4 xl:py-2.5 xl:min-h-[60px] pointer-events-auto border-b border-[var(--border)]"
        style={{ background: "linear-gradient(180deg, rgba(10,11,14,0.97), rgba(10,11,14,0.88))" }}
      >
        <div className="flex items-center gap-2.5 xl:gap-4 min-w-0">
          <Logo height={15} />
          <div className="hidden xl:block">{status}</div>
        </div>

        <div className="no-scrollbar order-last w-full flex flex-nowrap items-center gap-1.5 overflow-x-auto xl:order-none xl:w-auto xl:flex-wrap xl:justify-center xl:overflow-visible">
          <div className="xl:hidden shrink-0">{status}</div>
          {(Object.keys(LAYER_META) as EventKind[]).map((k) => {
            const m = LAYER_META[k];
            const on = layers[k];
            return (
              <button
                key={k}
                onClick={() => onToggle(k)}
                title={m.description}
                aria-pressed={on}
                className="inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all whitespace-nowrap"
                style={{
                  color: on ? "#fff" : "var(--muted-foreground)",
                  background: on ? `${m.color}24` : "rgba(17,19,21,0.8)",
                  borderColor: on ? `${m.color}77` : "var(--border-strong)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color, opacity: on ? 1 : 0.35 }} />
                {m.label}
              </button>
            );
          })}
        </div>

        <nav className="ml-auto flex items-center gap-1.5 text-[11px] xl:text-[12px]">
          <Link href="/ransomware" className="px-2 py-2 sm:px-3 sm:py-1.5 rounded-full sm:border border-[var(--border-strong)] text-[#c8cdd5] hover:text-white hover:border-[var(--triada-cyan)] transition-colors">Ransomware</Link>
          <Link href="/actors" className="px-2 py-2 sm:px-3 sm:py-1.5 rounded-full sm:border border-[var(--border-strong)] text-[#c8cdd5] hover:text-white hover:border-[var(--triada-cyan)] transition-colors">Actors</Link>
        </nav>
      </div>
    </header>
  );
}
