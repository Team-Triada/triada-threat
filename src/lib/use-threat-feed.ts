"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ThreatSnapshot } from "@/lib/live/types";

export const POLL_MS = 60_000;

export function useThreatFeed(initial: ThreatSnapshot | null = null) {
  const [snapshot, setSnapshot] = useState<ThreatSnapshot | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [nextAt, setNextAt] = useState<number>(0);
  const known = useRef<Set<string> | null>(initial ? new Set(initial.events.map((e) => e.id)) : null);
  // The first full snapshot after a slim server render is a baseline, not news.
  const slimBaseline = useRef(!!initial?.slim);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/threats", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next = (await res.json()) as ThreatSnapshot;
      const ids = new Set(next.events.map((e) => e.id));
      // First load establishes the baseline; later polls flag only additions.
      if (known.current && !slimBaseline.current) setNewIds(new Set([...ids].filter((id) => !known.current!.has(id))));
      slimBaseline.current = false;
      known.current = ids;
      setSnapshot(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    } finally {
      setLoading(false);
      setNextAt(Date.now() + POLL_MS);
    }
  }, []);

  useEffect(() => {
    // The server-rendered snapshot can be up to a minute old (ISR); only fetch
    // straight away if it is older than that or missing.
    const age = initial && !initial.slim ? Date.now() - new Date(initial.generatedAt).getTime() : Infinity;
    // Slim server copy: swap in the full snapshot once the page has settled.
    const first = age > 45_000 ? setTimeout(refresh, initial?.slim ? 1500 : 0) : undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (age <= 45_000) setNextAt(Date.now() + POLL_MS);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `initial` only matters on mount
  }, [refresh]);

  return { snapshot, error, loading, newIds, nextAt, refresh };
}

// Re-render every `ms` so relative timestamps ("4m ago") stay honest.
export function useNow(ms = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
