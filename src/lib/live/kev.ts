import "server-only";
import { getBigJson } from "./http";
import { MEMO_MS } from "./config";
import { memo } from "./memo";
import { plain } from "./text";
import type { KevItem } from "../domain/types";

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
  return memo("kev", MEMO_MS.kev, loadKev);
}

async function loadKev(): Promise<KevItem[]> {
  // Over Next's 2 MB fetch-cache limit, so it bypasses that cache (see getBigJson); memo above holds it.
  const raw = await getBigJson<Raw>(URL_KEV);
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
