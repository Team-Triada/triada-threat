export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type EventKind = "ransomware" | "kev" | "cve" | "c2" | "scan" | "news";

export type Victim = {
  id: string;
  group: string;
  victim: string;
  countryCode: string | null;
  sector: string | null;
  description: string | null;
  website: string | null;
  discoveredAt: string;
  attackedAt: string | null;
  permalink: string | null;
  screenshot: string | null;
  infostealer: boolean;
};

export type KevItem = {
  id: string;
  vendor: string;
  product: string;
  name: string;
  dateAdded: string;
  dueDate: string;
  description: string;
  requiredAction: string;
  ransomwareUse: boolean;
  cwes: string[];
};

export type CveRecord = {
  id: string;
  published: string;
  lastModified: string;
  description: string;
  cvss: { score: number; severity: string | null; vector: string; version: string } | null;
  weakness: string | null;
  references: { url: string; tags: string[] }[];
  vendor: string | null;
  product: string | null;
  epss: number | null;
  epssPercentile: number | null;
};

export type C2Server = {
  ip: string;
  port: number;
  malware: string;
  countryCode: string | null;
  asName: string | null;
  firstSeen: string;
  lastOnline: string | null;
  online: boolean;
  lat: number | null;
  lng: number | null;
  city: string | null;
};

export type ScannerSource = {
  ip: string;
  reports: number;
  targets: number;
  lat: number;
  lng: number;
  countryCode: string;
  city: string | null;
  org: string | null;
};

export type Article = {
  id: string;
  title: string;
  summary: string;
  link: string;
  source: string;
  publishedAt: string;
  cves: string[];
  tags: string[];
  severity: Severity;
  // Countries named in the headline/summary, most prominent first.
  countryCodes: string[];
};

export type SourceHealth = {
  name: string;
  ok: boolean;
  fetchedAt: string;
  count: number;
  // Timestamp of the newest item this source returned, so a quiet upstream
  // is distinguishable from a broken pipeline.
  newestAt?: string | null;
  error?: string;
  stale?: boolean;
};

// One normalised row for the live stream, whatever the upstream was.
export type ThreatEvent = {
  id: string;
  kind: EventKind;
  time: string;
  title: string;
  subtitle: string;
  severity: Severity;
  countryCode: string | null;
  source: string;
  url: string | null;
  // Pointer to richer detail, resolved against the snapshot on the client.
  ref: { type: EventKind; id: string };
};

export type ThreatSnapshot = {
  generatedAt: string;
  events: ThreatEvent[];
  victims: Victim[];
  kev: KevItem[];
  cves: CveRecord[];
  c2: C2Server[];
  scanners: ScannerSource[];
  articles: Article[];
  stats: {
    victims24h: number;
    victimsTotal: number | null;
    activeGroups24h: number;
    kevAdded7d: number;
    kevTotal: number;
    kevRansomware: number;
    critical24h: number;
    c2Online: number;
    articles24h: number;
  };
  topGroups: { group: string; count: number }[];
  topGroup24h: string | null;
  topCountries: { code: string; count: number }[];
  topSectors: { sector: string; count: number }[];
  sources: SourceHealth[];
};
