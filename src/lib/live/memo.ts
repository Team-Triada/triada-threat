// Process-level TTL cache with in-flight de-duplication and stale-on-error.
// Needed where the response is too large for Next's fetch data cache (2 MB
// limit; CISA's KEV feed is ~2.4 MB) or where we want one shared parse.
type Entry<T> = { at: number; value: T };
const store = new Map<string, Entry<unknown>>();
const pending = new Map<string, Promise<unknown>>();

export async function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  let p = pending.get(key) as Promise<T> | undefined;
  if (!p) {
    p = fn()
      .then((value) => {
        store.set(key, { at: Date.now(), value });
        return value;
      })
      .catch((err) => {
        // Serve the last good value rather than blanking the dashboard.
        if (hit) return hit.value;
        throw err;
      })
      .finally(() => pending.delete(key));
    pending.set(key, p);
  }
  return p;
}
