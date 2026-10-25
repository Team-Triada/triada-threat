// Server fetch helpers. Every upstream call goes through Next's data cache (next.revalidate),
// so polling visitors don't turn into one upstream request each.
import "server-only";
import { get as httpsGet } from "node:https";
import { gunzipSync } from "node:zlib";
import { SITE_URL } from "../seo";
export const UA = `triada-threat/1.0 (+${SITE_URL})`;

async function request(url: string, revalidate: number, init: RequestInit = {}, timeoutMs = 15000) {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": UA, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(timeoutMs),
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res;
}

export async function getJson<T>(url: string, revalidate: number, init?: RequestInit, timeoutMs?: number): Promise<T> {
  const res = await request(url, revalidate, { ...init, headers: { Accept: "application/json", ...(init?.headers ?? {}) } }, timeoutMs);
  return (await res.json()) as T;
}

export async function getText(url: string, revalidate: number, init?: RequestInit, timeoutMs?: number): Promise<string> {
  const res = await request(url, revalidate, init, timeoutMs);
  return res.text();
}

// For responses over Next's 2 MB fetch-cache limit (CISA KEV is ~2.4 MB, a big gang's victim history
// about the same). Next's patched fetch would
// try to cache the body, fail, and log an error on every refresh, so this goes straight to node:https.
// The caller keeps its own in-process cache (memo.ts). It does not touch the route's static/dynamic
// status, which only Next's fetch can change.
export function getBigJson<T>(url: string, headers: Record<string, string> = {}, timeoutMs = 30000, redirects = 3): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = httpsGet(url, { headers: { "User-Agent": UA, Accept: "application/json", "Accept-Encoding": "gzip", ...headers }, timeout: timeoutMs }, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400 && res.headers.location && redirects > 0) {
        res.resume();
        resolve(getBigJson<T>(new URL(res.headers.location, url).toString(), headers, timeoutMs, redirects - 1));
        return;
      }
      if (status !== 200) {
        res.resume();
        reject(new Error(`${url} -> ${status}`));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (c: Buffer) => {
        size += c.length;
        if (size > 25_000_000) req.destroy(new Error(`${url} -> response too large`));
        else chunks.push(c);
      });
      res.on("end", () => {
        try {
          const buf = Buffer.concat(chunks);
          resolve(JSON.parse((res.headers["content-encoding"] === "gzip" ? gunzipSync(buf) : buf).toString("utf8")) as T);
        } catch (e) {
          reject(e);
        }
      });
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error(`${url} -> timed out`)));
    req.on("error", reject);
  });
}
