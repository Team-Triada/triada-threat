"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import type { ThreatEvent, ThreatSnapshot } from "@/lib/live/types";
import { LAYER_META } from "@/lib/layers";
import { SEVERITY_COLOR, SEVERITY_LABEL } from "@/lib/severity";
import { countryName } from "@/lib/countries";
import { articlesForCve, assessC2, assessCve, assessVictim, ago, type Assessment, type Finding } from "@/lib/live/analysis";

export type Selection = { type: "event"; event: ThreatEvent } | { type: "country"; code: string };

const TONE: Record<NonNullable<Finding["tone"]>, string> = { bad: "#ff6b6b", warn: "#ffb347", ok: "#3ddc84", neutral: "#c8cdd5" };

export default function DetailPanel({ selection, snapshot, onClose }: { selection: Selection; snapshot: ThreatSnapshot; onClose: () => void }) {
  return (
    <aside aria-label="Details" className="dash-detail absolute z-30 inset-x-0 bottom-0 top-[var(--hdr)] p-0 pointer-events-none flex xl:inset-x-auto xl:right-0 xl:w-[400px] xl:p-4">
      <div className="card-surface pointer-events-auto flex flex-col w-full overflow-hidden">
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

function Shell({ kind, color, title, severity, time, onClose, children }: { kind: string; color: string; title: string; severity?: keyof typeof SEVERITY_COLOR; time?: string; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Move focus into the panel when it opens so keyboard/screen-reader users land on it.
  useEffect(() => closeRef.current?.focus({ preventScroll: true }), [title]);
  return (
    <div>
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
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
      <div className="px-4 pb-5 flex flex-col gap-4">{children}</div>
    </div>
  );
}

export function Gauge({ a }: { a: Assessment }) {
  const color = SEVERITY_COLOR[a.level];
  return (
    <div className="rounded-lg border border-[var(--border)] p-3 flex gap-3 items-center" style={{ background: `${color}0d` }}>
      <div className="relative w-14 h-14 shrink-0">
        <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(a.score / 100) * 97.4} 97.4`} />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums">{a.score}</div>
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-widest" style={{ color }}>Risk assessment · {SEVERITY_LABEL[a.level]}</div>
        <p className="text-[13px] leading-snug text-[#e8eaed] mt-0.5">{a.headline}</p>
      </div>
    </div>
  );
}

export function Findings({ rows }: { rows: Finding[] }) {
  return (
    <dl className="flex flex-col divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col gap-0.5 px-3 py-2">
          <dt className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">{r.label}</dt>
          <dd className="text-[13px] break-words" style={{ color: TONE[r.tone ?? "neutral"] }}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Actions({ items }: { items: string[] }) {
  return (
    <div>
      <span className="section-label">Recommended actions</span>
      <ol className="mt-2 flex flex-col gap-2">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-[#c8cdd5]">
            <span className="text-cyan tabular-nums shrink-0">{i + 1}.</span>
            {t}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] text-[var(--muted-foreground)]">Assessment is derived automatically from the live signals above; verify against your own asset inventory.</p>
    </div>
  );
}

function LinkOut({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  const cls = "text-xs text-cyan hover:underline w-fit";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children} ↗</a>
  ) : (
    <Link href={href} className={cls}>{children} →</Link>
  );
}

function EventView({ event, snapshot, onClose }: { event: ThreatEvent; snapshot: ThreatSnapshot; onClose: () => void }) {
  const color = LAYER_META[event.kind].color;
  const common = { color, severity: event.severity, time: event.time, onClose };

  if (event.kind === "ransomware") {
    const v = snapshot.victims.find((x) => x.id === event.ref.id);
    if (!v) return <Shell kind="RANSOMWARE" title={event.title} {...common}>Record no longer in the current window.</Shell>;
    const a = assessVictim(v, snapshot);
    const siblings = snapshot.victims.filter((x) => x.group === v.group && x.id !== v.id).slice(0, 5);
    return (
      <Shell kind="RANSOMWARE CLAIM" title={v.victim} {...common}>
        <Gauge a={a} />
        <Findings rows={[{ label: "Group", value: v.group, tone: "warn" }, { label: "Country", value: countryName(v.countryCode) }, ...(v.website ? [{ label: "Domain", value: v.website } as Finding] : []), ...a.findings]} />
        {v.description && (
          <div>
            <span className="section-label">Claim text</span>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#9aa1ab] line-clamp-6">{v.description}</p>
          </div>
        )}
        {v.screenshot && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.screenshot} alt={`Leak-site post for ${v.victim}`} className="rounded-lg border border-[var(--border)] w-full" loading="lazy" referrerPolicy="no-referrer" />
        )}
        <Actions items={a.actions} />
        {siblings.length > 0 && (
          <div>
            <span className="section-label">Other recent {v.group} victims</span>
            <ul className="mt-2 flex flex-col gap-1 text-[13px] text-[#c8cdd5]">
              {siblings.map((s) => (
                <li key={s.id} className="flex justify-between gap-2"><span className="truncate">{s.victim}</span><span className="text-[var(--muted-foreground)] shrink-0">{s.countryCode}</span></li>
              ))}
            </ul>
          </div>
        )}
        <LinkOut href={`/ransomware/${encodeURIComponent(v.group)}`}>Full {v.group} profile</LinkOut>
        {v.permalink && <LinkOut href={v.permalink} external>Source record</LinkOut>}
      </Shell>
    );
  }

  if (event.kind === "kev" || event.kind === "cve") {
    const id = event.ref.id;
    const kev = snapshot.kev.find((k) => k.id === id) ?? null;
    const cve = snapshot.cves.find((c) => c.id === id) ?? null;
    const a = assessCve(cve, kev);
    const related = articlesForCve(id, snapshot.articles);
    return (
      <Shell kind={kev ? "EXPLOITED VULNERABILITY" : "NEW CVE"} title={id} {...common} severity={a.level}>
        <Gauge a={a} />
        {(kev?.name || kev?.vendor) && (
          <Findings rows={[{ label: "Product", value: `${kev?.vendor} ${kev?.product}` }, { label: "Name", value: kev?.name ?? "" }]} />
        )}
        <p className="text-[13px] leading-relaxed text-[#c8cdd5]">{kev?.description ?? cve?.description}</p>
        <Findings rows={a.findings} />
        <Actions items={a.actions} />
        {related.length > 0 && (
          <div>
            <span className="section-label">Coverage</span>
            <ul className="mt-2 flex flex-col gap-2">
              {related.map((r) => (
                <li key={r.id}><a href={r.link} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#dde1e6] hover:text-cyan leading-snug block">{r.title}<span className="block text-[11px] text-[var(--muted-foreground)]">{r.source} · {ago(r.publishedAt)}</span></a></li>
              ))}
            </ul>
          </div>
        )}
        <LinkOut href={`/cve/${id}`}>Full vulnerability analysis</LinkOut>
      </Shell>
    );
  }

  if (event.kind === "c2") {
    const s = snapshot.c2.find((x) => `${x.ip}:${x.port}` === event.ref.id);
    if (!s) return <Shell kind="BOTNET C2" title={event.title} {...common}>Record no longer listed.</Shell>;
    const a = assessC2(s);
    return (
      <Shell kind="BOTNET C2" title={`${s.malware} · ${s.ip}`} {...common}>
        <Gauge a={a} />
        <Findings rows={[...a.findings, { label: "Country", value: countryName(s.countryCode) }]} />
        <Actions items={a.actions} />
        <LinkOut href="https://feodotracker.abuse.ch/browse/" external>abuse.ch Feodo Tracker</LinkOut>
      </Shell>
    );
  }

  if (event.kind === "scan") {
    const s = snapshot.scanners.find((x) => x.ip === event.ref.id);
    if (!s) return <Shell kind="SCANNER" title={event.title} {...common}>Source no longer in the top list.</Shell>;
    return (
      <Shell kind="MASS SCANNER" title={s.ip} {...common} time={undefined}>
        <p className="text-[13px] leading-relaxed text-[#c8cdd5]">
          Among today&apos;s most-reported attacking IPs on the SANS ISC DShield sensor network (honeypots and firewall logs worldwide). Typically automated scanning, brute-forcing and exploit probing.
        </p>
        <Findings rows={[
          { label: "Location", value: [s.city, countryName(s.countryCode)].filter(Boolean).join(", ") },
          { label: "Network", value: s.org ?? "Unknown" },
          { label: "Reports today", value: s.reports.toLocaleString(), tone: "warn" },
          { label: "Distinct sensors hit", value: s.targets.toLocaleString(), tone: s.targets >= 50 ? "bad" : "neutral" },
        ]} />
        <Actions items={["Block at the perimeter and in WAF/IDS if it shows up in your logs.", "Wide scanners (many sensors) are opportunistic: confirm nothing you expose matches what it probes.", "Check the IP's report history for the targeted ports and services."]} />
        <LinkOut href={`https://isc.sans.edu/ipinfo/${s.ip}`} external>SANS ISC IP report</LinkOut>
      </Shell>
    );
  }

  const art = snapshot.articles.find((x) => x.id === event.ref.id);
  if (!art) return <Shell kind="NEWS" title={event.title} {...common}>Article no longer in the current window.</Shell>;
  const linked = art.cves.map((id) => ({ id, kev: snapshot.kev.find((k) => k.id === id) }));
  return (
    <Shell kind={`NEWS · ${art.source.toUpperCase()}`} title={art.title} {...common}>
      <div className="flex flex-wrap gap-1.5">
        {art.tags.map((t) => <span key={t} className="pill-tag" style={{ padding: "3px 10px", fontSize: 11 }}>{t}</span>)}
      </div>
      <p className="text-[13px] leading-relaxed text-[#c8cdd5]">{art.summary}</p>
      {linked.length > 0 && (
        <div>
          <span className="section-label">Referenced CVEs</span>
          <ul className="mt-2 flex flex-col gap-1.5">
            {linked.map(({ id, kev }) => (
              <li key={id} className="flex items-center gap-2 text-[13px]">
                <Link href={`/cve/${id}`} className="text-cyan hover:underline">{id}</Link>
                {kev && <span className="text-[11px] font-semibold text-[#ff6b6b]">IN CISA KEV{kev.ransomwareUse ? " · RANSOMWARE" : ""}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <LinkOut href={art.link} external>Read full article</LinkOut>
    </Shell>
  );
}

function CountryView({ code, snapshot, onClose }: { code: string; snapshot: ThreatSnapshot; onClose: () => void }) {
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
