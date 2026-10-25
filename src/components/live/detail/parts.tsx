"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { SEVERITY_COLOR, SEVERITY_LABEL } from "@/lib/severity";
import { ago } from "@/lib/domain/analysis";

// Common frame for every detail view: header with kind, severity, age and close button.
export function Shell({ kind, color, title, severity, time, onClose, children }: { kind: string; color: string; title: string; severity?: keyof typeof SEVERITY_COLOR; time?: string; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Move focus into the panel when it opens so keyboard/screen-reader users land on it.
  useEffect(() => closeRef.current?.focus({ preventScroll: true }), [title]);
  return (
    <div>
      <div className="flex items-start justify-between gap-3 p-4 pb-3 @[560px]:px-6 @[560px]:pt-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-widest" style={{ color }}>
            {kind}
            {severity && (
              <span className="px-1.5 py-0.5 rounded-full border text-[11px]" style={{ color: SEVERITY_COLOR[severity], borderColor: `${SEVERITY_COLOR[severity]}55`, background: `${SEVERITY_COLOR[severity]}1a` }}>
                {SEVERITY_LABEL[severity].toUpperCase()}
              </span>
            )}
            {time && <span className="font-normal tracking-normal text-[var(--muted-foreground)]">{ago(time)}</span>}
          </div>
          <h3 className="heading-card mt-1.5 leading-snug break-words" style={{ fontSize: 17 }}>{title}</h3>
        </div>
        <button ref={closeRef} onClick={onClose} aria-label="Close details" className="text-[var(--muted-foreground)] hover:text-white p-1 -mr-1 -mt-1 leading-none max-xl:grid max-xl:h-10 max-xl:w-10 max-xl:place-items-center max-xl:rounded-full max-xl:border max-xl:border-[var(--border-strong)] max-xl:bg-[var(--muted)] max-xl:text-base">✕</button>
      </div>
      {/* Narrow: one stacked column. Wide: sections flow into two balanced columns, with the first block (gauge / summary) spanning both. */}
      <div className="px-4 pb-5 flex flex-col gap-4 @[560px]:block @[560px]:columns-2 @[560px]:gap-x-6 @[560px]:px-6 @[560px]:pb-6 @[560px]:[&>*]:mb-5 @[560px]:[&>*]:break-inside-avoid @[560px]:[&>*:first-child]:[column-span:all]">{children}</div>
    </div>
  );
}

export function LinkOut({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  const cls = "block text-xs text-cyan hover:underline w-fit";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children} ↗</a>
  ) : (
    <Link href={href} className={cls}>{children} →</Link>
  );
}
