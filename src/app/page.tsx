import Dashboard from "@/components/live/Dashboard";
import { buildSnapshot, slimSnapshot } from "@/lib/live/snapshot";

// Incremental static regeneration: the HTML ships with a recent snapshot already
// inside it (no "Connecting..." flash, fast LCP), and is rebuilt in the
// background at most once a minute. The browser then polls /api/threats.
export const revalidate = 60;

export default async function Home() {
  const full = await buildSnapshot().catch(() => null);
  const initial = full ? slimSnapshot(full) : null;
  return <Dashboard initial={initial} />;
}
