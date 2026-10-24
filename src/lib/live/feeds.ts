import { getText } from "./http";
import { safeUrl } from "../html";
import { geotag } from "./geotag";
import { codePoint, splitItems, stripTags, tagReader, unwrapCdata } from "./xml";
import type { Article, Severity } from "./types";

const FEEDS: { name: string; url: string }[] = [
  { name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews" },
  { name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/" },
  { name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/" },
  { name: "SecurityWeek", url: "https://www.securityweek.com/feed/" },
  { name: "Dark Reading", url: "https://www.darkreading.com/rss.xml" },
  { name: "The Record", url: "https://therecord.media/feed" },
  { name: "SANS ISC", url: "https://isc.sans.edu/rssfeed.xml" },
  { name: "Help Net Security", url: "https://www.helpnetsecurity.com/feed/" },
  { name: "CISA Alerts", url: "https://www.cisa.gov/cybersecurity-advisories/alerts.xml" },
  { name: "Unit 42", url: "https://unit42.paloaltonetworks.com/feed/" },
  { name: "Microsoft Security", url: "https://www.microsoft.com/en-us/security/blog/feed/" },
];

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "-", mdash: "-" };

function decode(s: string): string {
  return unwrapCdata(s)
    .replace(/&#(\d{1,7});/g, (_, n) => codePoint(Number(n)))
    .replace(/&#x([0-9a-f]{1,6});/gi, (_, n) => codePoint(parseInt(n, 16)))
    .replace(/&([a-z]{2,8});/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

function strip(html: string): string {
  return stripTags(decode(html))
    .replace(/[\u2013\u2014]/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

// Upper bounds on what one feed may hand us.
const MAX_FEED_CHARS = 4_000_000;
const MAX_ITEM_CHARS = 200_000;

const CVE_RE = /CVE-\d{4}-\d{4,7}/gi;

const TAGS: [string, RegExp][] = [
  ["Ransomware", /ransomware|extortion|leak site/i],
  ["Zero-Day", /zero-?day/i],
  ["Exploited", /actively exploited|exploited in the wild|under attack|in-the-wild/i],
  ["Data Breach", /data breach|breach|leak(ed)?|exposed/i],
  ["Malware", /malware|trojan|backdoor|infostealer|stealer|botnet|loader/i],
  ["Phishing", /phishing|credential theft|social engineering/i],
  ["APT", /\bAPT\d*\b|state-sponsored|nation-state|espionage/i],
  ["Supply Chain", /supply[- ]chain|npm|pypi|malicious package/i],
  ["Vulnerability", /vulnerabilit|CVE-\d{4}|patch|flaw/i],
];

function severityOf(text: string, cves: string[]): Severity {
  if (/zero-?day|actively exploited|exploited in the wild|under attack|critical (flaw|vulnerab|rce)|remote code execution|ransomware/i.test(text)) return "critical";
  if (/exploit|breach|backdoor|malware|botnet|espionage|APT\d*|stealer/i.test(text) || cves.length > 0) return "high";
  if (/vulnerab|flaw|patch|phishing|attack/i.test(text)) return "medium";
  return "info";
}

async function fetchFeed(feed: { name: string; url: string }): Promise<Article[]> {
  const xml = await getText(feed.url, 300);
  if (xml.length > MAX_FEED_CHARS) throw new Error("feed too large");
  return splitItems(xml, 20).flatMap((block): Article[] => {
    if (block.length > MAX_ITEM_CHARS) return [];
    const tag = tagReader(block);
    const title = strip(tag("title") ?? "");
    const link = safeUrl(strip(tag("link") ?? "")) ?? "";
    const pub = strip(tag("pubDate") ?? "");
    if (!title || !link) return [];
    const summary = strip(tag("description") ?? tag("content:encoded") ?? "").slice(0, 420);
    const text = `${title} ${summary}`;
    const cves = Array.from(new Set((text.match(CVE_RE) ?? []).map((c) => c.toUpperCase())));
    const date = new Date(/^\w{3}, \d+ \w{3} \d{2} /.test(pub) ? pub.replace(/ (\d{2}) (\d\d:)/, " 20$1 $2") : pub);
    return [
      {
        id: link,
        title,
        summary,
        link,
        source: feed.name,
        publishedAt: Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
        cves,
        tags: TAGS.filter(([, re]) => re.test(text)).map(([t]) => t),
        severity: severityOf(text, cves),
        countryCodes: geotag(title, summary),
      },
    ];
  });
}

export async function fetchArticles(): Promise<{ articles: Article[]; errors: string[] }> {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const errors: string[] = [];
  const articles: Article[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") articles.push(...r.value);
    else errors.push(`${FEEDS[i].name}: ${r.reason?.message ?? r.reason}`);
  });
  const seen = new Set<string>();
  const unique = articles.filter((a) => (seen.has(a.link) ? false : (seen.add(a.link), true)));
  return { articles: unique.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), errors };
}
