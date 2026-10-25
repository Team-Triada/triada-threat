import Link from "next/link";
import type { ThreatEvent, ThreatSnapshot } from "@/lib/domain/types";
import { LAYER_META } from "@/lib/layers";
import { countryName } from "@/lib/countries";
import { articlesForCve, assessC2, assessCve, assessVictim, ago, type Finding } from "@/lib/domain/analysis";
import { Actions, Findings, Gauge } from "@/components/ui/Assessment";
import { LinkOut, Shell } from "./parts";

export default function EventView({ event, snapshot, onClose }: { event: ThreatEvent; snapshot: ThreatSnapshot; onClose: () => void }) {
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
