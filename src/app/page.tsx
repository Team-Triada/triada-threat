import Dashboard from "@/components/live/Dashboard";
import { buildSnapshot } from "@/lib/live/snapshot";

// Incremental static regeneration: the HTML ships with a recent snapshot already
// inside it (no "Connecting..." flash, fast LCP), and is rebuilt in the
// background at most once a minute. The browser then polls /api/threats.
export const revalidate = 60;

export default async function Home() {
  const initial = await buildSnapshot().catch(() => null);
  return <Dashboard initial={initial} />;
}
