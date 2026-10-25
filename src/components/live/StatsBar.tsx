"use client";

import { BugAntIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, ServerStackIcon, ShieldExclamationIcon, UserGroupIcon } from "@heroicons/react/16/solid";
import StatTile from "@/components/ui/StatTile";
import type { ThreatSnapshot } from "@/lib/domain/types";

type Card = { label: string; short: string; value?: number; sub: string; color: string; title: string; Icon: typeof BugAntIcon };

export default function StatsBar({ snapshot, detailOpen, detailWide = false, covered = false, className = "" }: { snapshot: ThreatSnapshot | null; detailOpen: boolean; detailWide?: boolean; covered?: boolean; className?: string }) {
  const s = snapshot?.stats;
  const cards: Card[] = [
    { label: "Victims, last 24h", short: "Victims, 24h", value: s?.victims24h, sub: s?.victimsTotal ? `${s.victimsTotal.toLocaleString()} all-time` : "leak-site claims", color: "#ff8c3c", title: "Victims posted on gang leak sites in the last 24 hours (ransomware.live)", Icon: ShieldExclamationIcon },
    { label: "Active gangs, 24h", short: "Gangs, 24h", value: s?.activeGroups24h, sub: snapshot?.topGroup24h ? `most active: ${snapshot.topGroup24h}` : "posting now", color: "#ffcc3c", title: "Distinct ransomware groups that posted a victim in the last 24 hours", Icon: UserGroupIcon },
    { label: "Newly exploited, 7d", short: "Exploited, 7d", value: s?.kevAdded7d, sub: s ? `of ${s.kevTotal.toLocaleString()} in KEV · ${s.kevRansomware} ransomware` : "CISA KEV", color: "#ff3c3c", title: "CVEs added to CISA's Known Exploited Vulnerabilities catalog in the last 7 days", Icon: BugAntIcon },
    { label: "Critical CVEs, 48h", short: "Critical, 48h", value: s?.critical24h, sub: "CVSS 9.0 or higher (NVD)", color: "#ff6b6b", title: "CVEs published in the last 48h that NVD has already scored 9.0 or higher", Icon: ExclamationTriangleIcon },
    { label: "Botnet C2 online", short: "Botnet C2", value: s?.c2Online, sub: "abuse.ch Feodo Tracker", color: "#c77dff", title: "Botnet command-and-control servers currently online", Icon: ServerStackIcon },
    { label: "Mass scanners, today", short: "Scanners", value: snapshot?.scanners.length, sub: "SANS DShield top IPs", color: "#19d3c5", title: "Top attacking IPs seen by the DShield sensor network today, geolocated", Icon: MagnifyingGlassIcon },
  ];

  // Between the side panels. One row of six from 1440px; two rows below that. With the detail
  // panel expanded the gap is small, so the tiles regroup into 3 x 2 where it still fits (from
  // 1700px) and are hidden below that.
  const wide = detailOpen && detailWide;
  const right = wide ? "xl:right-[calc(min(820px,58vw)+16px)]" : detailOpen ? "xl:right-[416px]" : "xl:right-[376px]";
  // Ranges must not overlap: Tailwind emits arbitrary min-[] rules before sm:, so override order is not reliable.
  const cols = wide ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:max-[1439px]:grid-cols-3 min-[1440px]:grid-cols-6";

  return (
    <div
      id="panel-stats"
      inert={covered}
      aria-label="Key numbers"
      className={`dash-panel pointer-events-auto absolute z-10 overflow-y-auto thin-scroll p-3 bg-[rgba(10,11,14,0.97)] xl:pointer-events-none xl:bg-transparent xl:overflow-visible xl:h-auto xl:p-0 xl:bottom-4 xl:left-[376px] xl:inset-x-auto xl:flex xl:justify-center xl:transition-[right] xl:duration-200 xl:ease-out motion-reduce:transition-none ${right} ${wide ? "xl:max-[1699px]:hidden" : ""} ${className}`}
    >
      <div className={`pointer-events-auto grid w-full max-w-[1180px] gap-2 xl:gap-2 ${cols}`}>
        {cards.map((c) => (
          <StatTile key={c.label} label={c.label} short={c.short} value={c.value} sub={c.sub} color={c.color} Icon={c.Icon} title={`${c.title}. ${c.sub}`} />
        ))}
      </div>
    </div>
  );
}
