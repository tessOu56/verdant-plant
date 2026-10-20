import React, { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  BrandMark,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  StatusChip,
} from '@is_tess/components';
import { controlService, fetchServices, type ServiceInfo } from '../lib/api';
import { fmtUptime, STATUS_CHIP, STATUS_LABEL } from '../lib/nav';
import { ConnBadge, LiveRegion, SkipLink, boot } from '../lib/shell';
import { useSocket } from '../lib/useSocket';
import '../index.css';

const qc = new QueryClient();

function statusToChip(status: string) {
  return STATUS_CHIP[status] ?? 'neutral';
}

function canOpen(s: ServiceInfo, hosted: boolean) {
  return hosted || (s.status === 'running' && s.reachable);
}

function Dashboard() {
  const initial = useQuery({ queryKey: ['services'], queryFn: fetchServices, retry: 1 });
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [hosted, setHosted] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [liveMsg, setLiveMsg] = useState('');
  const [offlineBanner, setOfflineBanner] = useState(false);
  const prevStatus = useRef<Record<string, string>>({});
  const primed = useRef(false);

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

  useEffect(() => {
    if (status === 'closed') {
      const t = window.setTimeout(() => setOfflineBanner(true), 1200);
      return () => window.clearTimeout(t);
    }
    setOfflineBanner(false);
  }, [status]);

  useEffect(() => {
    if (status === 'open') setLiveMsg('已連上編排器');
    else if (status === 'closed') setLiveMsg('與編排器的連線已中斷，正在重連');
  }, [status]);

  useEffect(() => {
    if (!services.length) return;
    if (!primed.current) {
      for (const s of services) prevStatus.current[s.id] = s.status;
      primed.current = true;
      return;
    }
    const parts: string[] = [];
    for (const s of services) {
      if (prevStatus.current[s.id] && prevStatus.current[s.id] !== s.status) {
        parts.push(`${s.name} ${STATUS_LABEL[s.status] ?? s.status}`);
      }
      prevStatus.current[s.id] = s.status;
    }
    if (parts.length) setLiveMsg(parts.join('，'));
  }, [services]);

  const running = services.filter((s) => s.status === 'running').length;
  const ids = services.map((s) => s.id);
  const disconnected = offlineBanner || (initial.isError && status !== 'open' && services.length === 0);
  const loading = initial.isLoading && services.length === 0 && status === 'connecting';

  async function act(id: string, action: 'start' | 'stop') {
    setPending(`${id}:${action}`);
    setActionError(null);
    try {
      await controlService(id, action);
    } catch {
      setActionError(
        action === 'start'
          ? '啟動失敗：編排器未連線。本機執行 npm start 或 npm run dev:all。'
          : '停止失敗：編排器未連線。',
      );
    } finally {
      setPending(null);
    }
  }

  async function actAll(action: 'start' | 'stop') {
    setPending(`all:${action}`);
    setActionError(null);
    try {
      await Promise.all(ids.map((id) => controlService(id, action)));
    } catch {
      setActionError('批次操作失敗：編排器未連線。');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground" data-app="verdant">
      <SkipLink />
      <LiveRegion message={liveMsg} />
      <header className="border-b border-border bg-card/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandMark size="md" mode="tilt" interactive aria-hidden />
            <div>
              <h1 className="text-title font-semibold tracking-tight">Verdant</h1>
              <p className="text-label text-muted-foreground">
                Explore Design living lab · 本機編排控制台，不是託管產品
              </p>
            </div>
          </div>
          <ConnBadge status={status} />
        </div>
      </header>

      <section className="border-b border-border bg-muted/60 px-4 py-4 text-label leading-relaxed text-muted-foreground sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p>
            標註的前端深度 lab：同一套 <code className="font-mono text-foreground">@is_tess</code>{' '}
            套件，展示即時同步、Canvas、虛擬列表、Three.js、配方引擎能跑到哪。不是園藝電商，也不是
            Plinth。
          </p>
          <p className="mt-1 text-xs">
            需本機編排器（localhost:4000 / :5173）。
            {' '}
            <a className="underline underline-offset-2" href="https://ai-search-portal.vercel.app" target="_blank" rel="noreferrer">
              Portal
            </a>
            {' · '}
            <a className="underline underline-offset-2" href="https://metalcraft-storefront-eta.vercel.app/en" target="_blank" rel="noreferrer">
              Plinth
            </a>
            {' '}
            用同一套 Explore Design。
          </p>
        </div>
      </section>

      {disconnected ? (
        <div className="border-b border-border bg-muted px-4 py-3 sm:px-6">
          <Alert className="mx-auto max-w-6xl">
            <AlertTitle>編排器未連線</AlertTitle>
            <AlertDescription>
              WebSocket / REST 都連不上。在專案目錄執行 <code className="font-mono">npm start</code> 或{' '}
              <code className="font-mono">npm run dev:all</code>，然後按重試。這是本機 lab，沒有公開主機。
            </AlertDescription>
            <div className="mt-3">
              <Button size="sm" type="button" onClick={() => initial.refetch()}>
                重試連線
              </Button>
            </div>
          </Alert>
        </div>
      ) : null}

      {actionError ? (
        <div className="px-4 pt-4 sm:px-6">
          <Alert className="mx-auto max-w-6xl" role="alert">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 border-b border-border px-4 py-3 text-label text-muted-foreground sm:px-6">
        <span>
          運行中{' '}
          <b className="text-foreground tabular-nums">
            {running} / {services.length || '—'}
          </b>
        </span>
        <span className="hidden sm:inline">TCP 健康檢查每 2s 經 WebSocket 廣播</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            type="button"
            disabled={!ids.length || pending !== null}
            onClick={() => actAll('start')}
          >
            全部啟動
          </Button>
          <Button
            size="sm"
            variant="outline"
            type="button"
            disabled={!ids.length || pending !== null}
            onClick={() => actAll('stop')}
          >
            全部停止
          </Button>
        </div>
      </div>

      <main id="main" className="mx-auto max-w-6xl p-4 sm:p-6">
        {loading ? (
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,280px),1fr))' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : services.length === 0 ? (
          <EmptyState
            title="還沒有站點資料"
            description="連上編排器後會列出花園、綻放、花圃、3D、Atelier 五站。若編排器已在跑，按重試。"
            action={
              <Button size="sm" type="button" onClick={() => initial.refetch()}>
                重試
              </Button>
            }
          />
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,280px),1fr))' }}>
            {services.map((s) => {
              const openable = canOpen(s, hosted);
              const starting = s.status === 'starting' || pending === `${s.id}:start`;
              return (
                <Card key={s.id} className="relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-1" style={{ background: s.accent }} />
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle>{s.name}</CardTitle>
                      <StatusChip status={statusToChip(s.status)} live={s.status === 'running'}>
                        {STATUS_LABEL[s.status] ?? s.status}
                      </StatusChip>
                    </div>
                    <CardDescription>{s.role}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="min-h-[3.75rem] text-sm text-muted-foreground">{s.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.tags.map((t) => (
                        <Badge key={t} variant="outline">
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-y-1 border-t border-dashed border-border pt-3 text-xs text-muted-foreground">
                      <span>
                        埠 <b className="text-foreground tabular-nums">:{s.port}</b>
                      </span>
                      <span>
                        PID <b className="text-foreground tabular-nums">{s.pid ?? '—'}</b>
                      </span>
                      <span>
                        運行 <b className="text-foreground tabular-nums">{fmtUptime(s.uptime)}</b>
                      </span>
                      <span>
                        可達{' '}
                        <b className="text-foreground">
                          {s.status === 'running' ? (s.reachable ? '可連' : '檢查中') : '—'}
                        </b>
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                      <Button
                        className="flex-1"
                        size="sm"
                        disabled={['running', 'starting'].includes(s.status) || pending !== null}
                        onClick={() => act(s.id, 'start')}
                      >
                        {starting ? '啟動中…' : '啟動'}
                      </Button>
                      <Button
                        className="flex-1"
                        size="sm"
                        variant="outline"
                        disabled={['stopped', 'stopping'].includes(s.status) || pending !== null}
                        onClick={() => act(s.id, 'stop')}
                      >
                        停止
                      </Button>
                      {openable ? (
                        <Button className="flex-1" size="sm" variant="secondary" asChild>
                          <a href={s.url}>開啟</a>
                        </Button>
                      ) : (
                        <Button
                          className="flex-1"
                          size="sm"
                          variant="secondary"
                          disabled
                          title="啟動並等到可達後即可開啟"
                        >
                          開啟
                        </Button>
                      )}
                    </div>
                    {s.id === 'atelier' && !hosted ? (
                      <p className="text-xs text-muted-foreground">
                        不需啟動也可開{' '}
                        <a className="underline underline-offset-2" href="/atelier.html">
                          離線 demo
                        </a>
                        （瀏覽器內配方引擎，無 Node API）。
                      </p>
                    ) : null}
                    {!openable && s.status === 'stopped' ? (
                      <p className="text-xs text-muted-foreground">啟動後「開啟」才會可按。</p>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <footer className="px-4 py-6 text-center text-xs text-muted-foreground">
        spawn／kill 子服務 · 手刻 WebSocket · UI 消費 @is_tess/components · 本機 lab，非託管產品
      </footer>
    </div>
  );
}

boot(
  <QueryClientProvider client={qc}>
    <Dashboard />
  </QueryClientProvider>,
);
