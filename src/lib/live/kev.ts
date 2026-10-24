import { getJson } from "./http";
import { memo } from "./memo";
import { plain } from "./text";
import type { KevItem } from "./types";

const URL_KEV = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

type Raw = {
  vulnerabilities: {
    cveID: string;
    vendorProject: string;
    product: string;
    vulnerabilityName: string;
    dateAdded: string;
    dueDate: string;
    shortDescription: string;
    requiredAction: string;
    knownRansomwareCampaignUse: string;
    cwes?: string[];
  }[];
};

export function fetchKev(): Promise<KevItem[]> {
  return memo("kev", 30 * 60_000, loadKev);
}

async function loadKev(): Promise<KevItem[]> {
  // The body is over Next's 2 MB fetch-cache limit, so it is not stored there
  // (memo above holds it). A positive revalidate matters: 0 would force every
  // route that reads KEV, including the home page, to render dynamically.
  const raw = await getJson<Raw>(URL_KEV, 3600);
  return raw.vulnerabilities
    .map((v) => ({
      id: v.cveID,
      vendor: plain(v.vendorProject),
      product: plain(v.product),
      name: plain(v.vulnerabilityName),
      dateAdded: v.dateAdded,
      dueDate: v.dueDate,
      description: plain(v.shortDescription),
      requiredAction: plain(v.requiredAction),
      ransomwareUse: v.knownRansomwareCampaignUse === "Known",
      cwes: v.cwes ?? [],
    }))
    .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
}
