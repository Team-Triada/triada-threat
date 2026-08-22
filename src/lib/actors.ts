import attackData from "../../data/attack-groups.json";
import attributionData from "../../data/actor-attribution.json";
import type { Article } from "./live/types";

type RawAttackGroup = {
  mitreId: string;
  slug: string;
  name: string;
  aliases: string[];
  description: string;
  techniques: string[];
  malwareFamilies: string[];
  mitreUrl: string | null;
};

type Attribution = {
  mitreId: string;
  country: string;
  countryCode: string | null;
  attribution: string;
};

export type ThreatActor = {
  id: string;
  mitreId: string;
  name: string;
  aliases: string[];
  country: string;
  countryCode: string | null;
  attribution: string;
  description: string;
  techniques: string[];
  malwareFamilies: string[];
  mitreUrl: string | null;
};

const { groups: rawGroups } = attackData as unknown as { groups: RawAttackGroup[] };
const attributionById = new Map((attributionData as Attribution[]).map((a) => [a.mitreId, a]));

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ATT&CK descriptions are Markdown with inline citations, e.g.
// "[APT28](https://attack.mitre.org/groups/G0007) is ... (Citation: DOJ 2018)".
function cleanMitre(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s*\(Citation:[^)]*\)/g, "")
    .replace(/\s*\(Citation:[^)]*$/, "") // cut off mid-citation by the 600-char fetch limit
    .replace(/\s*[\u2013\u2014]\s*/g, " - ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/([.!?])[^.!?]*$/, "$1"); // end on a full sentence
}

const actors: ThreatActor[] = rawGroups.map((g) => {
  const attr = attributionById.get(g.mitreId);
  return {
    id: slugFromName(g.name),
    mitreId: g.mitreId,
    name: g.name,
    aliases: g.aliases,
    country: attr?.country ?? "Unattributed",
    countryCode: attr?.countryCode ?? null,
    attribution: attr?.attribution ?? "No public state or group attribution on record",
    description: cleanMitre(g.description),
    techniques: g.techniques,
    malwareFamilies: g.malwareFamilies,
    mitreUrl: g.mitreUrl,
  };
});

const actorsById = new Map(actors.map((a) => [a.id, a]));

export function getActors(): ThreatActor[] {
  return actors;
}

export function getActorById(id: string): ThreatActor | undefined {
  return actorsById.get(id);
}

// Matches an actor's canonical name or any alias as a whole word against
// article title/summary. Skips aliases under 4 chars to avoid noisy matches.
export function getArticlesForActor(actor: ThreatActor, articles: Article[]): Article[] {
  const names = [actor.name, ...actor.aliases].filter((n) => n.length >= 4);
  if (names.length === 0) return [];
  const pattern = new RegExp(`\\b(${names.map(escapeRe).join("|")})\\b`, "i");
  return articles.filter((item) => pattern.test(`${item.title} ${item.summary}`));
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
