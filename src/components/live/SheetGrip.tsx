"use client";

import { useCallback, useEffect, useRef, type PointerEvent as RPointerEvent } from "react";

export type Snap = "collapsed" | "half" | "full";
const ORDER: Snap[] = ["collapsed", "half", "full"];
// Keep in sync with --tabs in globals.css (24px grip row + 34px tab row).
const TABS = 58;
const LABEL: Record<Snap, string> = { collapsed: "map only", half: "half height", full: "full height" };

function heights(): Record<Snap, number> {
  const h = window.innerHeight;
  const hdr = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hdr")) || 84;
  return { collapsed: TABS, half: Math.min(560, Math.max(250, h * 0.44)) /* = clamp(250px, 44dvh, 560px), the --sheet default in globals.css */, full: Math.max(TABS + 120, h - hdr) };
}

/**
 * Drag handling for the mobile bottom sheet. Dragging anywhere on the tab bar
 * moves the sheet live (by writing --sheet on :root, which the globe and
 * background already follow), then eases to the nearest snap point. Taps still
 * reach the tab buttons: a drag only starts after 6px of vertical movement.
 */
export function useSheetDrag(snap: Snap, setSnap: (s: Snap) => void) {
  const st = useRef({ y0: 0, h0: 0, moved: false, id: -1, last: 0, lastT: 0, v: 0, cur: 0, suppress: false, raf: 0 });
  useEffect(() => () => cancelAnimationFrame(st.current.raf), []);

  const onPointerDown = useCallback((e: RPointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const s = st.current;
    cancelAnimationFrame(s.raf);
    s.y0 = e.clientY;
    s.h0 = heights()[snap];
    s.cur = s.h0;
    s.moved = false;
    s.id = e.pointerId;
    s.last = e.clientY;
    s.lastT = performance.now();
    s.v = 0;
  }, [snap]);

  const onPointerMove = useCallback((e: RPointerEvent<HTMLElement>) => {
    const s = st.current;
    if (e.pointerId !== s.id) return;
    const dy = s.y0 - e.clientY;
    if (!s.moved) {
      if (Math.abs(dy) < 6) return;
      s.moved = true;
      // Pin the globe at its current size and lay the sheet out at full height
      // once; from here on only --sheet-dy (a transform) changes.
      const root = document.documentElement;
      root.style.setProperty("--sheet-g", `${s.h0}px`);
      root.style.setProperty("--sheet", `${heights().full}px`);
      root.dataset.drag = "1";
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // pointer already gone; the drag still follows move events
      }
    }
    const hs = heights();
    s.cur = Math.min(hs.full, Math.max(hs.collapsed, s.h0 + dy));
    const now = performance.now();
    s.v = (s.last - e.clientY) / Math.max(1, now - s.lastT); // px/ms, positive = upwards
    s.last = e.clientY;
    s.lastT = now;
    document.documentElement.style.setProperty("--sheet-dy", `${hs.full - s.cur}px`);
  }, []);

  // Ease the sheet from `from` px to the `target` snap point, then commit.
  const settle = useCallback((from: number, target: Snap) => {
    const s = st.current;
    const hs = heights();
    const root = document.documentElement;
    const to = hs[target];
    if (!root.dataset.drag) {
      root.style.setProperty("--sheet-g", `${hs[snap]}px`);
      root.style.setProperty("--sheet", `${hs.full}px`);
      root.style.setProperty("--sheet-dy", `${hs.full - from}px`);
      root.dataset.drag = "1";
    }
    cancelAnimationFrame(s.raf);
    const t0 = performance.now();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = (now: number) => {
      const p = reduce ? 1 : Math.min(1, (now - t0) / 240);
      const k = 1 - Math.pow(1 - p, 3);
      root.style.setProperty("--sheet-dy", `${hs.full - (from + (to - from) * k)}px`);
      if (p < 1) s.raf = requestAnimationFrame(step);
      else {
        // Commit: switch the snap attribute and drop the drag overrides in the
        // same frame so the layout changes exactly once.
        root.dataset.snap = target;
        setSnap(target);
        for (const v of ["--sheet", "--sheet-g", "--sheet-dy"]) root.style.removeProperty(v);
        delete root.dataset.drag;
      }
    };
    s.raf = requestAnimationFrame(step);
  }, [snap, setSnap]);

  // Animated jump to a snap point (grip tap, keyboard, tab tap while collapsed).
  const goTo = useCallback((target: Snap) => {
    if (target === snap) return;
    settle(heights()[snap], target);
  }, [snap, settle]);

  const finish = useCallback((e: RPointerEvent<HTMLElement>) => {
    const s = st.current;
    if (e.pointerId !== s.id) return;
    s.id = -1;
    if (!s.moved) return;
    s.suppress = true;
    setTimeout(() => (s.suppress = false), 0);
    const hs = heights();
    let idx = ORDER.reduce((best, k, i) => (Math.abs(hs[k] - s.cur) < Math.abs(hs[ORDER[best]] - s.cur) ? i : best), 0);
    if (Math.abs(s.v) > 0.5) idx = Math.min(2, Math.max(0, ORDER.indexOf(snap) + (s.v > 0 ? 1 : -1)));
    const target = ORDER[idx];
    settle(s.cur, target);
  }, [snap, settle]);

  // A drag that ends over a tab button must not also count as a click on it.
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (st.current.suppress) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return { handlers: { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish, onClickCapture }, goTo };
}

// Visible grip plus a keyboard/screen-reader control for the same job.
export default function SheetGrip({ snap, setSnap }: { snap: Snap; setSnap: (s: Snap) => void }) {
  const next = ORDER[(ORDER.indexOf(snap) + 1) % 3];
  return (
    <button
      type="button"
      onClick={() => setSnap(next)}
      onKeyDown={(e) => {
        const i = ORDER.indexOf(snap);
        if (e.key === "ArrowUp") { e.preventDefault(); setSnap(ORDER[Math.min(2, i + 1)]); }
        if (e.key === "ArrowDown") { e.preventDefault(); setSnap(ORDER[Math.max(0, i - 1)]); }
      }}
      aria-label={`Resize panel, currently ${LABEL[snap]}. Activate for ${LABEL[next]}.`}
      className="absolute inset-x-0 top-0 z-10 h-6"
    />
  );
}
