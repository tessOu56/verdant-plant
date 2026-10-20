/** Station child ports spawned by the local orchestrator. */
export const STATION_PORTS = new Set(['4101', '4102', '4103', '4104', '4105']);

export type LocationBits = {
  port: string;
  pathname: string;
  referrer: string;
  protocol: string;
  hostname: string;
};

/**
 * Where “返回控制台” should go.
 * - Station on :410x → the referring console origin, else :4000
 * - Console MPA page (`/garden.html` on :4000 / :5173) → `/`
 * - Capacitor / atelier-as-index → null (no back link)
 */
export function resolveConsoleHref({
  port,
  pathname,
  referrer,
  protocol,
  hostname,
}: LocationBits): string | null {
  if (STATION_PORTS.has(port)) {
    if (referrer) {
      try {
        const u = new URL(referrer);
        if (!STATION_PORTS.has(u.port)) return `${u.origin}/`;
      } catch {
        /* ignore malformed referrer */
      }
    }
    return `${protocol}//${hostname}:4000/`;
  }
  const path = pathname.replace(/\/index\.html$/i, '/');
  if (path !== '/' && /\.html$/i.test(path)) return '/';
  return null;
}

export function fmtUptime(ms: number) {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h) return `${h}h ${m % 60}m`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export const STATUS_LABEL: Record<string, string> = {
  running: '運行中',
  stopped: '已停止',
  starting: '啟動中…',
  stopping: '停止中…',
};

export const STATUS_CHIP: Record<string, 'success' | 'neutral' | 'warning'> = {
  running: 'success',
  stopped: 'neutral',
  starting: 'warning',
  stopping: 'warning',
};

export function humanizeCraftError(msg: string) {
  if (msg.startsWith('insufficient:')) return '材料不足，無法開始提煉';
  if (msg === 'craft_in_progress') return '已有提煉進行中';
  if (msg === 'no_craft') return '沒有進行中的提煉';
  if (msg === 'not_ready') return '尚未完成，請稍候再收取';
  if (msg === 'unknown_recipe') return '找不到這個配方';
  return msg;
}
