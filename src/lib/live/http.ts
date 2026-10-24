// Server-side fetch helpers. Every upstream call goes through Next's data
// cache (`next.revalidate`) so the dashboard polling us never fans out into
// one upstream request per visitor.
export const UA = "triada-threat/1.0 (+https://threat.triada.in)";

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
