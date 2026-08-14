import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import {
  BrandMark,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LiveStatusBadge,
  StatusChip,
} from '@is_tess/components';
import { fetchServices, type ServiceInfo } from '../lib/api';
import { useSocket } from '../lib/useSocket';
import '@is_tess/tokens/css/verdant.css';
import '../index.css';

const qc = new QueryClient();

function fmtUptime(ms: number) {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
  if (h) return `${h}h ${m % 60}m`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

const LABEL: Record<string, string> = {
  running: '運行中',
  stopped: '已停止',
  starting: '啟動中…',
  stopping: '停止中…',
};

const CHIP: Record<string, 'success' | 'neutral' | 'warning'> = {
  running: 'success',
  stopped: 'neutral',
  starting: 'warning',
  stopping: 'warning',
};

async function act(id: string, action: 'start' | 'stop') {
  await fetch(`/api/services/${id}/${action}`, { method: 'POST' });
}

async function actAll(action: 'start' | 'stop', ids: string[]) {
  await Promise.all(ids.map((id) => act(id, action)));
}

function statusToChip(status: string) {
  return CHIP[status] ?? 'neutral';
}

function Dashboard() {
  const initial = useQuery({ queryKey: ['services'], queryFn: fetchServices });
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [hosted, setHosted] = useState(false);
  const { status } = useSocket('/ws', (msg) => {
    if (msg.type === 'snapshot') {
      setServices(msg.services);
      if (typeof msg.hosted === 'boolean') setHosted(msg.hosted);
    }
  });

  useEffect(() => {
    if (initial.data && services.length === 0) {
      setServices(initial.data.services);
      if (typeof initial.data.hosted === 'boolean') setHosted(initial.data.hosted);
    }
  }, [initial.data, services.length]);

  const running = services.filter((s) => s.status === 'running').length;
  const ids = services.map((s) => s.id);

  return (
    <div className="min-h-screen bg-background text-foreground" data-app="verdant">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card/80 px-6 py-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <BrandMark size="md" />
          <div>
            <h1 className="text-lg font-semibold tracking-wide">Verdant Platform</h1>
            <p className="text-xs text-muted-foreground">
              Explore Design 動態能力 lab · @is_tess/* living proof
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <LiveStatusBadge status={status === 'open' ? 'success' : 'danger'}>
            {status === 'open' ? '即時連線中' : '重連中…'}
          </LiveStatusBadge>
        </div>
      </header>

      <section className="border-b border-border bg-muted/40 px-6 py-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          <strong className="text-foreground">Portal</strong> 解決資料信任 ·{' '}
          <strong className="text-foreground">Plinth</strong> 賣金工體驗 ·{' '}
          <strong className="text-foreground">Verdant</strong> 用同一套 Explore Design，現場展示即時／效能／3D／配方能跑多深。
        </p>
        <p className="mt-1 text-xs">
          不是園藝電商。公開主站為動態編排控制台（非純靜態 brochure）。
          {' '}
          <a className="underline underline-offset-2" href="https://ai-search-portal.vercel.app" target="_blank" rel="noreferrer">Portal</a>
          {' · '}
          <a className="underline underline-offset-2" href="https://metalcraft-storefront-eta.vercel.app/en" target="_blank" rel="noreferrer">Plinth</a>
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-4 border-b border-border bg-card/50 px-6 py-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-4 text-sm">
          <span>
            運行中{' '}
            <b className="text-foreground tabular-nums">
              {running} / {services.length}
            </b>
          </span>
          <span>TCP 健康檢查每 2s 經 WebSocket 廣播</span>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" type="button" onClick={() => actAll('start', ids)}>
            全部啟動
          </Button>
          <Button size="sm" variant="outline" type="button" onClick={() => actAll('stop', ids)}>
            全部停止
          </Button>
        </div>
      </div>

      <main className="grid gap-5 p-6" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))' }}>
        {services.map((s) => (
          <Card key={s.id} className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: s.accent }} />
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle>{s.name}</CardTitle>
                <StatusChip status={statusToChip(s.status)} live={s.status === 'running'}>
                  {LABEL[s.status] ?? s.status}
                </StatusChip>
              </div>
              <CardDescription style={{ color: s.accent }}>{s.role}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="min-h-[60px] text-sm text-muted-foreground">{s.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {s.tags.map((t) => (
                  <span key={t} className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px]">
                    {t}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-y-1 border-t border-dashed border-border pt-3 text-xs text-muted-foreground">
                <span>埠 <b className="text-foreground tabular-nums">:{s.port}</b></span>
                <span>PID <b className="text-foreground tabular-nums">{s.pid ?? '—'}</b></span>
                <span>運行 <b className="text-foreground tabular-nums">{fmtUptime(s.uptime)}</b></span>
                <span>
                  可達{' '}
                  <b className="text-foreground">
                    {s.status === 'running' ? (s.reachable ? '✓' : '檢查中') : '—'}
                  </b>
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1"
                  size="sm"
                  disabled={['running', 'starting'].includes(s.status)}
                  onClick={() => act(s.id, 'start')}
                >
                  啟動
                </Button>
                <Button
                  className="flex-1"
                  size="sm"
                  variant="outline"
                  disabled={['stopped', 'stopping'].includes(s.status)}
                  onClick={() => act(s.id, 'stop')}
                >
                  停止
                </Button>
                <Button
                  className="flex-1"
                  size="sm"
                  variant="secondary"
                  asChild
                >
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={
                      hosted || (s.status === 'running' && s.reachable)
                        ? ''
                        : 'pointer-events-none opacity-40'
                    }
                  >
                    開啟 ↗
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
      <footer className="py-6 text-center text-xs text-muted-foreground">
        spawn／kill 子服務 · 手刻 WebSocket · UI via @is_tess/components@0.1.2 · tokens verdant map
      </footer>
    </div>
  );
}

document.documentElement.setAttribute('data-app', 'verdant');

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={qc}>
    <Dashboard />
  </QueryClientProvider>
);
