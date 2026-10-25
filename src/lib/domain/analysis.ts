// Pure, client-safe analysis helpers. Everything here is derived from real
// upstream signals (CVSS, EPSS, CISA KEV, leak-site cadence), no invented
// numbers. The output is labelled as an assessment in the UI.
import type { Article, C2Server, CveRecord, KevItem, Severity, ThreatSnapshot, Victim } from "./types";
import ORIGIN from "../../../data/ransomware-origin.json";

const ORIGINS = ORIGIN as Record<string, { countryCode: string | null; note: string }>;

export type Finding = { label: string; value: string; tone?: "bad" | "warn" | "ok" | "neutral" };

export type Assessment = {
  score: number; // 0-100
  level: Severity;
  headline: string;
  findings: Finding[];
  actions: string[];
};

function levelOf(score: number): Severity {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export function groupOrigin(group: string) {
  return ORIGINS[group.toLowerCase().replace(/\s+/g, "")] ?? null;
}

export function daysUntil(iso: string, now = Date.now()): number {
  return Math.ceil((new Date(iso).getTime() - now) / 86400_000);
}

export function assessCve(cve: CveRecord | null, kev: KevItem | null): Assessment {
  const cvss = cve?.cvss?.score ?? null;
  const epss = cve?.epss ?? null;
  let score = 0;
  if (cvss !== null) score += cvss * 5; // up to 50
  if (kev) score += 30;
  if (kev?.ransomwareUse) score += 10;
  if (epss !== null) score += Math.min(epss, 1) * 10;
  score = Math.min(100, Math.round(score));

  const findings: Finding[] = [];
  if (kev) {
    findings.push({ label: "Exploitation", value: "Confirmed in the wild (CISA KEV)", tone: "bad" });
    const d = daysUntil(kev.dueDate);
    findings.push({
      label: "Federal remediation deadline",
      value: d < 0 ? `Overdue by ${-d} day${-d === 1 ? "" : "s"}` : d === 0 ? "Due today" : `${d} day${d === 1 ? "" : "s"} left (${kev.dueDate})`,
      tone: d <= 3 ? "bad" : "warn",
    });
    if (kev.ransomwareUse) findings.push({ label: "Ransomware", value: "Used in known ransomware campaigns", tone: "bad" });
  } else {
    findings.push({ label: "Exploitation", value: "Not in CISA KEV (no confirmed exploitation recorded)", tone: "ok" });
  }
  if (cvss !== null) {
    findings.push({ label: "CVSS", value: `${cvss.toFixed(1)} ${cve?.cvss?.severity ?? ""}`.trim(), tone: cvss >= 9 ? "bad" : cvss >= 7 ? "warn" : "neutral" });
  } else {
    findings.push({ label: "CVSS", value: "Not yet scored by NVD", tone: "neutral" });
  }
  if (epss !== null) {
    findings.push({
      label: "EPSS (30-day exploit probability)",
      value: `${(epss * 100).toFixed(epss < 0.01 ? 2 : 1)}% · top ${Math.max(1, Math.round((1 - (cve?.epssPercentile ?? 0)) * 100))}% of all CVEs`,
      tone: epss >= 0.5 ? "bad" : epss >= 0.1 ? "warn" : "neutral",
    });
  }
  if (cve?.weakness) findings.push({ label: "Weakness", value: cve.weakness, tone: "neutral" });

  const vector = cve?.cvss?.vector ?? "";
  if (/AV:N/.test(vector)) findings.push({ label: "Attack vector", value: "Network, remotely reachable", tone: "warn" });
  if (/PR:N/.test(vector) && /UI:N/.test(vector)) findings.push({ label: "Preconditions", value: "No privileges and no user interaction", tone: "bad" });

  const actions: string[] = [];
  if (kev?.requiredAction) actions.push(kev.requiredAction);
  if (kev || (cvss ?? 0) >= 9) actions.push("Treat as emergency change: patch or isolate internet-facing instances first.");
  if (/AV:N/.test(vector)) actions.push("Review exposure: confirm which instances are reachable from the internet and restrict access until patched.");
  actions.push("Hunt for compromise: review logs for the disclosure window, not just from the patch date.");
  if (kev?.ransomwareUse) actions.push("Verify offline/immutable backups and segment the affected systems. This flaw is used for ransomware initial access.");

  const headline = kev
    ? `Actively exploited${kev.ransomwareUse ? " and used by ransomware crews" : ""}. Patch immediately.`
    : (cvss ?? 0) >= 9
      ? "Critical severity but no confirmed exploitation yet. Patch on priority."
      : "No confirmed exploitation. Schedule per normal patch cadence unless exposed.";

  return { score, level: levelOf(score), headline, findings, actions };
}

export function groupTempo(group: string, victims: Victim[], now = Date.now()) {
  const mine = victims.filter((v) => v.group === group);
  const last24 = mine.filter((v) => now - new Date(v.discoveredAt).getTime() < 86400_000);
  const sectors = new Map<string, number>();
  const countries = new Map<string, number>();
  for (const v of mine) {
    if (v.sector) sectors.set(v.sector, (sectors.get(v.sector) ?? 0) + 1);
    if (v.countryCode) countries.set(v.countryCode, (countries.get(v.countryCode) ?? 0) + 1);
  }
  const rank = (m: Map<string, number>) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return { count: mine.length, last24: last24.length, sectors: rank(sectors), countries: rank(countries) };
}

const SECTOR_ADVICE: [RegExp, string][] = [
  [/health|hospital|pharma/i, "Healthcare: confirm clinical downtime procedures and notify under applicable breach rules (HIPAA/GDPR) if patient data is claimed."],
  [/financ|bank|insurance/i, "Financial: review third-party/customer exposure; regulators often require notification within 72h."],
  [/government|public/i, "Government: coordinate with the national CERT; assume citizen data may be published."],
  [/educat/i, "Education: student/staff PII is commonly leaked. Prepare notification and credential resets."],
  [/energy|utilit|manufactur|transport/i, "Operational sector: verify IT/OT segmentation; check whether production systems were touched."],
];

export function assessVictim(v: Victim, snap: Pick<ThreatSnapshot, "victims">): Assessment {
  const tempo = groupTempo(v.group, snap.victims);
  const origin = groupOrigin(v.group);
  const critical = !!v.sector && /health|hospital|energy|utilit|financ|bank|government|public|education|transport|telecom|water/i.test(v.sector);
  let score = 45;
  if (critical) score += 25;
  if (tempo.last24 >= 5) score += 15;
  else if (tempo.last24 >= 2) score += 8;
  if (v.infostealer) score += 10;
  if (v.description) score += 3;
  score = Math.min(100, score);

  const ageH = Math.max(0, Math.round((Date.now() - new Date(v.discoveredAt).getTime()) / 3600_000));
  const findings: Finding[] = [
    { label: "Claimed", value: ageH < 1 ? "Within the last hour" : `${ageH}h ago on the group's leak site`, tone: ageH < 6 ? "warn" : "neutral" },
    { label: "Sector", value: v.sector ?? "Unclassified", tone: critical ? "bad" : "neutral" },
    { label: "Group tempo", value: `${tempo.last24} posts in 24h · ${tempo.count} in the recent window`, tone: tempo.last24 >= 5 ? "bad" : "neutral" },
  ];
  if (tempo.sectors.length) findings.push({ label: "Group's usual targets", value: tempo.sectors.map(([s, n]) => `${s} (${n})`).join(", "), tone: "neutral" });
  if (origin?.countryCode) findings.push({ label: "Assessed nexus", value: `${origin.countryCode}: ${origin.note}`, tone: "neutral" });
  if (v.infostealer) findings.push({ label: "Infostealer", value: "Victim credentials appear in infostealer logs, likely initial access vector", tone: "bad" });

  const actions = [
    "A leak-site claim is the extortion stage: data is already exfiltrated. Treat it as a confirmed incident, not a rumour.",
    ...SECTOR_ADVICE.filter(([re]) => v.sector && re.test(v.sector)).map(([, t]) => t),
    "For other organisations: check whether you share this victim as a vendor/customer and rotate shared credentials.",
  ];
  return {
    score,
    level: levelOf(score),
    headline: `${v.group} posted ${v.victim}${v.sector ? ` (${v.sector})` : ""}${v.countryCode ? ` in ${v.countryCode}` : ""}.`,
    findings,
    actions,
  };
}

export function assessC2(s: C2Server): Assessment {
  const ageD = Math.floor((Date.now() - new Date(s.firstSeen).getTime()) / 86400_000);
  return {
    score: s.online ? 70 : 30,
    level: s.online ? "high" : "low",
    headline: `${s.malware} botnet command-and-control server ${s.online ? "currently online" : "recently offline"}.`,
    findings: [
      { label: "Malware family", value: s.malware, tone: "bad" },
      { label: "Endpoint", value: `${s.ip}:${s.port}`, tone: "neutral" },
      { label: "Hosting", value: s.asName ?? "Unknown AS", tone: "neutral" },
      { label: "First seen", value: `${ageD}d ago`, tone: "neutral" },
      { label: "Status", value: s.online ? "Online" : "Offline", tone: s.online ? "bad" : "ok" },
    ],
    actions: [
      "Block this IP/port at egress and search proxy/firewall/DNS logs for historical connections.",
      "Any host that contacted it should be treated as infected: isolate and reimage.",
    ],
  };
}

export function articlesForCve(id: string, articles: Article[]): Article[] {
  return articles.filter((a) => a.cves.includes(id));
}

export function ago(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
