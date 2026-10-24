"use client";

import type { ThreatSnapshot } from "@/lib/live/types";

type Card = { label: string; value?: number; sub: string; color: string; title: string };

export default function StatsBar({ snapshot, detailOpen, detailWide = false, covered = false, className = "" }: { snapshot: ThreatSnapshot | null; detailOpen: boolean; detailWide?: boolean; covered?: boolean; className?: string }) {
  const s = snapshot?.stats;
  const cards: Card[] = [
    { label: "Victims, last 24h", value: s?.victims24h, sub: s?.victimsTotal ? `${s.victimsTotal.toLocaleString()} all-time` : "leak-site claims", color: "#ff8c3c", title: "Victims posted on gang leak sites in the last 24 hours (ransomware.live)" },
    { label: "Active gangs, 24h", value: s?.activeGroups24h, sub: snapshot?.topGroup24h ? `most active: ${snapshot.topGroup24h}` : "posting now", color: "#ffcc3c", title: "Distinct ransomware groups that posted a victim in the last 24 hours" },
    { label: "Newly exploited, 7d", value: s?.kevAdded7d, sub: s ? `of ${s.kevTotal.toLocaleString()} in KEV · ${s.kevRansomware} ransomware` : "CISA KEV", color: "#ff3c3c", title: "CVEs added to CISA's Known Exploited Vulnerabilities catalog in the last 7 days" },
    { label: "Critical CVEs, 48h", value: s?.critical24h, sub: "CVSS 9.0 or higher (NVD)", color: "#ff6b6b", title: "CVEs published in the last 48h that NVD has already scored 9.0 or higher" },
    { label: "Botnet C2 online", value: s?.c2Online, sub: "abuse.ch Feodo Tracker", color: "#c77dff", title: "Botnet command-and-control servers currently online" },
    { label: "Mass scanners, today", value: snapshot?.scanners.length, sub: "SANS DShield top IPs", color: "#19d3c5", title: "Top attacking IPs seen by the DShield sensor network today, geolocated" },
  ];

  return (
    <div
      id="panel-stats"
      inert={covered}
      aria-label="Key numbers"
      className={`dash-panel pointer-events-auto absolute z-10 overflow-y-auto thin-scroll p-3 bg-[rgba(10,11,14,0.97)] xl:pointer-events-none xl:bg-transparent xl:overflow-visible xl:h-auto xl:p-0 xl:bottom-4 xl:left-[376px] xl:inset-x-auto xl:flex xl:justify-center ${detailOpen ? "xl:right-[416px]" : "xl:right-[376px]"} ${detailOpen && detailWide ? "xl:hidden" : ""} ${className}`}
    >
      <div className="pointer-events-auto grid grid-cols-2 sm:grid-cols-3 min-[1900px]:grid-cols-6 gap-2 xl:gap-2.5 w-full max-w-[1100px]">
        {cards.map((c) => (
          <div key={c.label} title={c.title} className="stat-card px-3 py-2.5 xl:px-4 xl:py-3 min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wide text-[#b4bcc9] truncate">{c.label}</div>
            <div className="mt-1 text-[24px] xl:text-[28px] leading-none font-semibold tabular-nums" style={{ color: c.color, fontFamily: "var(--font-telegraf), sans-serif" }}>
              {c.value === undefined ? "-" : c.value.toLocaleString()}
            </div>
            <div className="mt-1.5 text-[12px] leading-snug text-[var(--muted-foreground)] line-clamp-2">{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
