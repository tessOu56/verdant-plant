// TanStack Query 用的資料抓取（非即時資料走 REST）
export type LeaderRow = { name: string; blooms: number; area: string };

export async function fetchLeaderboard(): Promise<LeaderRow[]> {
  const r = await fetch('/api/leaderboard');
  if (!r.ok) throw new Error('leaderboard failed');
  return r.json();
}

export type ServiceInfo = {
  id: string; name: string; port: number; accent: string; tags: string[];
  role: string; desc: string; status: string; pid: number | null;
  uptime: number; reachable: boolean; url: string;
};

export async function fetchServices(): Promise<{ services: ServiceInfo[]; hosted?: boolean }> {
  const r = await fetch('/api/services');
  if (!r.ok) throw new Error('services failed');
  return r.json();
}
