"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- react-globe.gl ships loose accessor types */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { C2Server, ScannerSource, Victim } from "@/lib/live/types";
import { country, jitter } from "@/lib/countries";
import { groupOrigin } from "@/lib/live/analysis";
import { esc } from "@/lib/html";
import { useNow } from "@/lib/use-threat-feed";

type CountryFeature = { properties: Record<string, string | number> };

// Natural Earth leaves ISO_A2 as "-99" for a few countries (France, Norway...).
function isoOf(f: CountryFeature): string | null {
  const iso = String(f.properties.ISO_A2);
  if (iso !== "-99") return iso;
  const wb = String(f.properties.WB_A2 ?? "");
  if (wb && wb !== "-99") return wb;
  return f.properties.NAME === "Norway" ? "NO" : null;
}

type Ring = [number, number][];

function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ISO code of the country containing lat/lng (outer ring minus holes).
function countryAt(features: any[], lat: number, lng: number): string | null {
  for (const f of features) {
    const g = f.geometry;
    if (!g) continue;
    const polys: Ring[][] = g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];
    for (const [outer, ...holes] of polys) {
      if (inRing(lng, lat, outer) && !holes.some((h) => inRing(lng, lat, h))) return isoOf(f);
    }
  }
  return null;
}

export type GlobePoint = {
  id: string;
  kind: "country" | "c2" | "scan";
  lat: number;
  lng: number;
  count: number;
  label: string;
  color: string;
  code: string | null;
};

type Arc = { id: string; startLat: number; startLng: number; endLat: number; endLng: number; label: string };

type Props = {
  victims: Victim[];
  c2: C2Server[];
  scanners: ScannerSource[];
  showRansomware: boolean;
  showC2: boolean;
  showScan: boolean;
  showNews: boolean;
  newsCounts: Record<string, number>;
  freshIds: Set<string>;
  focus: { lat: number; lng: number } | null;
  selectedCode: string | null;
  onSelectCountry: (code: string) => void;
};

// Natural Earth 110m countries, self-hosted so the globe has no runtime CDN dependency.
const LAND_URL = "/geo/countries.geojson";
const DAY = 86400_000;

// Stable object identity per victim (see note in the component). Module-level so
// it survives re-renders; bounded by the ~100 victims the feed ever returns.
const RENDERER_CONFIG = { antialias: true, alpha: true, powerPreference: "high-performance" as const };
const SIDE_COLOR = () => "rgba(0,0,0,0)";
const POINT_COLOR = (d: GlobePoint) => d.color;
const POINT_RADIUS = (d: GlobePoint) => (d.kind === "scan" ? 0.18 + d.count * 0.02 : 0.3);
const POINT_LABEL = (d: GlobePoint) => `<div style="font-family:Inter,sans-serif;font-size:12px;padding:2px 0">${d.label}</div>`;
const RING_COLOR = (d: { fresh: boolean }) => (t: number) => `rgba(255,${d.fresh ? 60 : 140},60,${1 - t})`;
const RING_RADIUS = (d: { fresh: boolean }) => (d.fresh ? 6 : 3.5);
const ARC_COLOR = () => ["rgba(255,200,80,0.95)", "rgba(255,60,60,0.9)"];
const ARC_LABEL = (d: Arc) => d.label;
const ARC_CACHE = new Map<string, Arc>();
const RING_CACHE = new Map<string, { lat: number; lng: number; fresh: boolean }>();

// react-globe.gl touches `window` at import, so it loads after mount only.
function ThreatGlobe({ victims, c2, scanners, showRansomware, showC2, showScan, showNews, newsCounts, freshIds, focus, selectedCode, onSelectCountry }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [Globe, setGlobe] = useState<any>(null);
  const [land, setLand] = useState<any[]>([]);
  const [hover, setHover] = useState<string | null>(null);

  const [failed, setFailed] = useState<string | null>(null);
  const now = useNow(60_000);

  const material = useMemo(() => new THREE.MeshPhongMaterial({ color: "#06080c", shininess: 8 }), []);

  useEffect(() => {
    let alive = true;
    const probe = document.createElement("canvas");
    const hasWebGL = !!(probe.getContext("webgl2") || probe.getContext("webgl"));
    if (!hasWebGL) setTimeout(() => alive && setFailed("WebGL is unavailable in this browser, so the 3D globe can't render. The live stream and panels still work."), 0);
    else
      import("react-globe.gl")
        .then((m) => alive && setGlobe(() => m.default))
        .catch((e) => alive && setFailed(`Globe failed to load: ${e?.message ?? e}`));
    fetch(LAND_URL)
      .then((r) => r.json())
      .then((g) => alive && setLand(g.features ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ width: e.contentRect.width, height: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const c = g.controls();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    c.autoRotate = !reduce;
    c.autoRotateSpeed = 0.3;
    // react-globe.gl uses TrackballControls: smoothness comes from the dynamic
    // damping factor (lower = longer glide) and a gentle zoom step per wheel tick.
    c.staticMoving = false;
    c.dynamicDampingFactor = 0.07;
    c.rotateSpeed = 0.7;
    c.zoomSpeed = 0.45;
    c.minDistance = 150;
    c.maxDistance = 500;
    g.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 1280 ? 1.25 : 1.5));
    const narrow = window.innerWidth < 1280;
    g.pointOfView({ lat: 25, lng: 10, altitude: narrow ? 2.05 : 1.75 }, 0);

    // Stop auto-rotation while the user is dragging or has something focused,
    // and ease it back in after a quiet period.
    let resume: ReturnType<typeof setTimeout> | undefined;
    // Hover raycasting against ~170 polygons on every mouse move is the main
    // CPU cost while dragging/zooming, so it is switched off for the gesture.
    const pause = () => {
      c.autoRotate = false;
      clearTimeout(resume);
    };
    const later = () => {
      clearTimeout(resume);
      if (!reduce) resume = setTimeout(() => (c.autoRotate = true), 8000);
    };
    c.addEventListener("start", pause);
    c.addEventListener("end", later);
    return () => {
      clearTimeout(resume);
      c.removeEventListener("start", pause);
      c.removeEventListener("end", later);
    };
  }, [Globe]);

  // Country selection is resolved here, not by the library's raycast picking:
  // a tap/click is converted to lat/lng and matched against the country
  // polygons. Works the same for touch and mouse and costs one lookup per tap.
  // Raycast picking (hover tooltips) only runs while a mouse is over the globe.
  const [mouseInside, setMouseInside] = useState(false);
  const selectRef = useRef(onSelectCountry);
  useEffect(() => {
    selectRef.current = onSelectCountry;
  }, [onSelectCountry]);
  const landRef = useRef(land);
  useEffect(() => {
    landRef.current = land;
  }, [land]);

  useEffect(() => {
    const g = globeRef.current;
    const el = wrapRef.current;
    if (!g || !el) return;
    let down: { x: number; y: number; t: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const quick = performance.now() - down.t < 600;
      down = null;
      if (moved > 8 || !quick) return; // a drag/rotate, not a tap
      const r = el.getBoundingClientRect();
      const coords = g.toGlobeCoords(e.clientX - r.left, e.clientY - r.top) as { lat: number; lng: number } | null;
      if (!coords) return; // tapped space, not the globe
      const code = countryAt(landRef.current, coords.lat, coords.lng);
      if (code) selectRef.current(code);
    };
    const onEnter = (e: PointerEvent) => e.pointerType === "mouse" && setMouseInside(true);
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      setMouseInside(false);
      setHover(null);
    };
    el.addEventListener("pointerdown", onDown, { capture: true });
    el.addEventListener("pointerup", onUp, { capture: true });
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointerdown", onDown, { capture: true });
      el.removeEventListener("pointerup", onUp, { capture: true });
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [Globe]);

  useEffect(() => {
    const g = globeRef.current;
    if (!focus || !g) return;
    g.controls().autoRotate = false;
    g.pointOfView({ ...focus, altitude: window.innerWidth < 1280 ? 2.2 : 1.6 }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1100);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => (g.controls().autoRotate = !reduce), 12000);
    return () => clearTimeout(t);
  }, [focus]);

  const victimCounts = useMemo(() => {
    const m = new Map<string, number>();
    if (showRansomware) for (const v of victims) if (v.countryCode) m.set(v.countryCode, (m.get(v.countryCode) ?? 0) + 1);
    return m;
  }, [victims, showRansomware]);

  // Accessors keep a stable identity: react-globe.gl re-evaluates a whole layer
  // whenever one of its props changes, so inline arrows would redo every
  // polygon, point and arc on each React render (hover, click, poll).
  const capColor = useCallback(
    (f: CountryFeature) => {
      const iso = isoOf(f);
      const n = iso ? victimCounts.get(iso) ?? 0 : 0;
      // Selected: keep the data colour family but lift it; the white border
      // and raised altitude carry the "selected" signal.
      if (iso && iso === selectedCode) return n ? "rgba(255,110,80,0.95)" : "rgba(120,170,255,0.55)";
      if (iso && iso === hover) return "rgba(255,255,255,0.3)";
      if (n === 0) {
        const news = showNews && iso ? newsCounts[iso] ?? 0 : 0;
        return news ? `rgba(60,157,255,${Math.min(0.55, 0.22 + news * 0.08)})` : "#15181d";
      }
      const t = Math.min(1, n / 12);
      return `rgba(255,${Math.round(150 - 90 * t)},50,${0.35 + 0.5 * t})`;
    },
    [hover, selectedCode, victimCounts, showNews, newsCounts]
  );
  const strokeColor = useCallback(
    (f: CountryFeature) => (selectedCode && isoOf(f) === selectedCode ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.22)"),
    [selectedCode]
  );
  const altitude = useCallback((f: CountryFeature) => (selectedCode && isoOf(f) === selectedCode ? 0.03 : 0.012), [selectedCode]);
  const polyLabel = useCallback(
    (f: CountryFeature) => {
      const iso = isoOf(f);
      const n = iso ? victimCounts.get(iso) ?? 0 : 0;
      const news = showNews && iso ? newsCounts[iso] ?? 0 : 0;
      const lines = [n ? `${n} ransomware victim${n === 1 ? "" : "s"} (recent)` : "No recent ransomware claims", news ? `${news} news stor${news === 1 ? "y" : "ies"} (48h)` : ""].filter(Boolean);
      return `<div style="font-family:Inter,sans-serif;font-size:12px;padding:2px 0"><b>${esc(f.properties.NAME)}</b><br/>${lines.join("<br/>")}</div>`;
    },
    [victimCounts, showNews, newsCounts]
  );
  const onPolyHover = useCallback((f: CountryFeature | null) => setHover(f ? isoOf(f) : null), []);

  const points = useMemo<GlobePoint[]>(() => {
    const out: GlobePoint[] = [];
    if (showC2) {
      for (const s of c2.filter((s) => s.online)) {
        const c = country(s.countryCode);
        const lat = s.lat ?? (c ? c.lat + jitter(`${s.ip}a`, 1.5) : null);
        const lng = s.lng ?? (c ? c.lng + jitter(`${s.ip}b`, 1.5) : null);
        if (lat === null || lng === null) continue;
        out.push({
          id: `c2:${s.ip}`,
          kind: "c2",
          lat,
          lng,
          count: 1,
          code: s.countryCode,
          color: "#c77dff",
          label: `<b>${esc(s.malware)} C2</b><br/>${esc(s.ip)}:${esc(s.port)}<br/>${esc([s.city, s.countryCode].filter(Boolean).join(", "))}`,
        });
      }
    }
    if (showScan) {
      for (const s of scanners) {
        out.push({
          id: `scan:${s.ip}`,
          kind: "scan",
          lat: s.lat,
          lng: s.lng,
          count: Math.min(12, Math.ceil(Math.log10(s.reports + 1))),
          code: s.countryCode,
          color: "#19d3c5",
          label: `<b>Scanner ${esc(s.ip)}</b><br/>${esc([s.city, s.countryCode].filter(Boolean).join(", "))}<br/>${s.reports.toLocaleString()} reports · ${s.targets.toLocaleString()} sensors`,
        });
      }
    }
    return out;
  }, [c2, scanners, showC2, showScan]);

  // Strike replay: the last 24h of claims, oldest first, played back a few
  // at a time. Each strike pings its target country; it also draws an arc when
  // the gang has an assessed home country. Fresh claims jump the queue.
  const sequence = useMemo(() => {
    if (!showRansomware) return [];
    return victims
      .filter((v) => v.countryCode && country(v.countryCode) && now - new Date(v.discoveredAt).getTime() < DAY)
      .sort((a, b) => a.discoveredAt.localeCompare(b.discoveredAt));
  }, [victims, showRansomware, now]);

  // react-globe.gl diffs by object identity: rebuilding objects each tick
  // restarts every arc/ring animation, which reads as jitter. Keep one stable
  // object per victim for as long as it stays in the playback window.

  const [cursor, setCursor] = useState(0);
  useEffect(() => {
    if (sequence.length === 0) return;
    const t = setInterval(() => setCursor((c) => c + 1), 2200);
    return () => clearInterval(t);
  }, [sequence.length]);

  const active = useMemo(() => {
    const n = sequence.length;
    if (n === 0) return [];
    const window = Math.min(6, n);
    const played = Array.from({ length: window }, (_, i) => sequence[(((cursor - i) % n) + n) % n]);
    const fresh = sequence.filter((v) => freshIds.has(`rw:${v.id}`)).slice(-4);
    return Array.from(new Map([...played, ...fresh].map((v) => [v.id, v])).values());
  }, [sequence, cursor, freshIds]);

  const arcs = useMemo<Arc[]>(() => {
    const out: Arc[] = [];
    for (const v of active) {
      let arc = ARC_CACHE.get(v.id);
      if (!arc) {
        const to = country(v.countryCode);
        const originCode = groupOrigin(v.group)?.countryCode;
        const from = country(originCode);
        if (!to || !from || originCode === v.countryCode) continue;
        arc = {
          id: v.id,
          startLat: from.lat,
          startLng: from.lng,
          endLat: to.lat,
          endLng: to.lng,
          label: `${esc(v.group)} → ${esc(v.victim)} (assessed gang nexus)`,
        };
        ARC_CACHE.set(v.id, arc);
      }
      out.push(arc);
    }
    return out;
  }, [active]);

  const rings = useMemo(() => {
    const out: { lat: number; lng: number; fresh: boolean }[] = [];
    for (const v of active) {
      let ring = RING_CACHE.get(v.id);
      if (!ring) {
        const c = country(v.countryCode);
        if (!c) continue;
        ring = { lat: c.lat, lng: c.lng, fresh: freshIds.has(`rw:${v.id}`) };
        RING_CACHE.set(v.id, ring);
      }
      out.push(ring);
    }
    return out;
  }, [active, freshIds]);

  return (
    <div
      ref={wrapRef}
      className="dash-globe absolute inset-x-0 top-[var(--hdr)] bottom-[var(--sheet)] xl:bottom-[var(--stats)] touch-none">
      {!Globe && (
        <div className="absolute inset-0 grid place-items-center text-xs text-[var(--muted-foreground)] pointer-events-none">
          {failed ?? "Loading globe…"}
        </div>
      )}
      {Globe && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={material}
          atmosphereColor="#ff5a4a"
          atmosphereAltitude={0.16}
          polygonsData={land}
          polygonCapColor={capColor}
          polygonSideColor={SIDE_COLOR}
          polygonStrokeColor={strokeColor}
          enablePointerInteraction={mouseInside}
          rendererConfig={RENDERER_CONFIG}
          polygonAltitude={altitude}
          polygonCapCurvatureResolution={4}
          pointResolution={6}
          arcCircularResolution={4}
          polygonsTransitionDuration={0}
          polygonLabel={polyLabel}
          onPolygonHover={onPolyHover}
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointColor={POINT_COLOR}
          pointAltitude={0.012}
          pointRadius={POINT_RADIUS}
          pointLabel={POINT_LABEL}
          ringsData={rings}
          ringColor={RING_COLOR}
          ringMaxRadius={RING_RADIUS}
          ringPropagationSpeed={2}
          ringRepeatPeriod={1500}
          arcsData={arcs}
          arcColor={ARC_COLOR}
          arcAltitudeAutoScale={0.3}
          arcCurveResolution={32}
          arcDashLength={0.35}
          arcDashGap={2}
          arcDashInitialGap={1}
          arcDashAnimateTime={2600}
          arcsTransitionDuration={0}
          arcStroke={0.3}
          arcLabel={ARC_LABEL}
        />
      )}
    </div>
  );
}

export default memo(ThreatGlobe);
