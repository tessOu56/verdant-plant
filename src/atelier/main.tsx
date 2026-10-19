import React, { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
} from '@is_tess/components';
import {
  completeCraft,
  effectiveDurationSec,
  fetchCatalog,
  fetchCraft,
  fetchInventory,
  resetInventory,
  resolveMode,
  startCraft,
} from './client';
import type { Domain, Recipe } from './types';
import { humanizeCraftError } from '../lib/nav';
import { StationShell, boot } from '../lib/shell';
import '../index.css';

const qc = new QueryClient();
const MODE = resolveMode();
const SHORTCUTS = [
  { id: 'smelt_copper', label: '煉銅', domain: 'alchemy' as const },
  { id: 'emulsify_mayo', label: '乳化', domain: 'kitchen' as const },
  { id: 'evaporate_brine', label: '蒸發結晶', domain: 'physics' as const },
] as const;

const DOMAINS: { id: Domain; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'alchemy', label: '鍊金' },
  { id: 'kitchen', label: '廚房' },
  { id: 'physics', label: '物理' },
];

const ICON_COLOR: Record<string, string> = {
  mineral: 'var(--chart-series-1, #3e5b53)',
  plant: 'var(--accent-brand, #3d8b4f)',
  element: 'var(--status-warning, #c99a4b)',
  alloy: 'var(--chart-series-6, #ad7247)',
  food: 'var(--chart-series-3, #c99a4b)',
  food_product: 'var(--chart-series-3, #c99a4b)',
  solution: 'var(--status-info, #0284c7)',
  phase: 'var(--status-info, #0284c7)',
  extract: 'var(--accent-strong, #2a6438)',
  compound: 'var(--chart-series-8, #55617d)',
  element_carrier: 'var(--text-primary, #1a2e1a)',
  element_compound: 'var(--status-info, #0284c7)',
};

function SchematicChip({ label, sub, color }: { label: string; sub?: string; color: string }) {
  return (
    <div className="flex min-w-[72px] flex-col items-center gap-1">
      <div
        className="grid h-12 w-12 place-items-center rounded-xl border-2 font-mono text-[10px] text-primary-foreground"
        style={{ background: color, borderColor: color }}
      >
        {label.slice(0, 4)}
      </div>
      <span className="max-w-[80px] text-center text-xs leading-tight text-foreground">{label}</span>
      {sub ? <span className="text-[10px] tabular-nums text-muted-foreground">×{sub}</span> : null}
    </div>
  );
}

function Atelier() {
  const client = useQueryClient();
  const [domain, setDomain] = useState<Domain>('all');
  const [selectedId, setSelectedId] = useState<string | null>('smelt_copper');
  const [now, setNow] = useState(Date.now());
  const [err, setErr] = useState<string | null>(null);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [live, setLive] = useState('');

  const catalog = useQuery({
    queryKey: ['atelier-catalog', MODE],
    queryFn: () => fetchCatalog(MODE),
  });
  const inventory = useQuery({
    queryKey: ['atelier-inventory', MODE],
    queryFn: () => fetchInventory(MODE),
    refetchInterval: MODE === 'remote' ? 2000 : false,
    retry: 1,
  });
  const craft = useQuery({
    queryKey: ['atelier-craft', MODE],
    queryFn: () => fetchCraft(MODE),
    refetchInterval: MODE === 'remote' ? 500 : 250,
    retry: 1,
  });

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const substances = catalog.data?.substances ?? [];
  const recipes = catalog.data?.recipes ?? [];
  const stock = inventory.data?.stock ?? {};
  const job = craft.data?.job ?? null;
  const byId = useMemo(() => Object.fromEntries(substances.map((s) => [s.id, s])), [substances]);
  const filtered = recipes.filter((r) => domain === 'all' || r.domain === domain);
  const selected = recipes.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  const invalidate = () => {
    client.invalidateQueries({ queryKey: ['atelier-inventory'] });
    client.invalidateQueries({ queryKey: ['atelier-craft'] });
  };

  const startMut = useMutation({
    mutationFn: (recipeId: string) => startCraft(MODE, recipeId),
    onSuccess: () => {
      setErr(null);
      setLive(`開始提煉 ${selected?.name.zh ?? ''}`);
      invalidate();
    },
    onError: (e: Error) => setErr(humanizeCraftError(e.message)),
  });
  const completeMut = useMutation({
    mutationFn: () => completeCraft(MODE),
    onSuccess: (body) => {
      setErr(null);
      const gained = Object.keys(body.stock).filter((id) => (body.stock[id] ?? 0) > (stock[id] ?? 0));
      setFlashIds(new Set(gained));
      setTimeout(() => setFlashIds(new Set()), 1200);
      setLive('收取完成，庫存已更新');
      invalidate();
    },
    onError: (e: Error) => setErr(humanizeCraftError(e.message)),
  });
  const resetMut = useMutation({
    mutationFn: () => resetInventory(MODE),
    onSuccess: () => {
      setErr(null);
      setLive('庫存已重置為種子資料');
      invalidate();
    },
    onError: (e: Error) => setErr(humanizeCraftError(e.message)),
  });

  const remainMs = job ? Math.max(0, job.readyAt - now) : 0;
  const ready = !!job && remainMs === 0;
  const totalMs = job ? Math.max(1, job.readyAt - job.startedAt) : 1;
  const progress = job ? Math.min(1, (now - job.startedAt) / totalMs) : 0;
  const demoSec = selected ? effectiveDurationSec(selected, MODE) : 0;
  const stockRows = Object.entries(stock)
    .filter(([, q]) => q > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  function pickShortcut(id: string, d: Domain) {
    setSelectedId(id);
    setDomain(d === 'all' ? 'all' : d);
  }

  const remoteDown = MODE === 'remote' && (inventory.isError || craft.isError);

  return (
    <StationShell
      title="Atelier 鍊金工坊"
      description={
        MODE === 'local'
          ? '離線 demo · 配方引擎在瀏覽器 · localStorage · 不是上線遊戲'
          : '遠端 API · ?api=1 · 需本機 Atelier 站 :4105'
      }
      live={live}
      actions={
        <Button size="sm" variant="outline" type="button" onClick={() => resetMut.mutate()}>
          重置庫存
        </Button>
      }
    >
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label="試玩捷徑">
          {SHORTCUTS.map((s) => (
            <Button
              key={s.id}
              type="button"
              size="sm"
              variant={selectedId === s.id ? 'default' : 'outline'}
              aria-pressed={selectedId === s.id}
              onClick={() => pickShortcut(s.id, s.domain)}
            >
              試玩：{s.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="領域">
          {DOMAINS.map((d) => (
            <Button
              key={d.id}
              type="button"
              size="sm"
              variant={domain === d.id ? 'secondary' : 'ghost'}
              aria-pressed={domain === d.id}
              onClick={() => setDomain(d.id)}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </div>

      {remoteDown ? (
        <Alert className="mb-4">
          <AlertDescription>
            遠端 API 無法連線。離線 demo 不需後端：去掉網址的 <code className="font-mono">?api=1</code>
            ，或從控制台啟動 Atelier 站。
          </AlertDescription>
        </Alert>
      ) : null}

      {err ? (
        <Alert className="mb-4" role="alert">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_200px] sm:gap-5">
        <Card className="order-2 max-h-[40vh] overflow-auto lg:order-1 lg:max-h-[70vh]">
          <CardHeader>
            <CardTitle className="text-sm">配方</CardTitle>
          </CardHeader>
          <CardContent>
            {catalog.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-5/6" />
              </div>
            ) : catalog.isError ? (
              <EmptyState className="py-6" title="配方載入失敗" description="目錄是打包進頁面的；重新整理試試。" />
            ) : !filtered.length ? (
              <EmptyState className="py-6" title="這個領域沒有配方" description="換一個領域，或按「全部」。" />
            ) : (
              <ul className="space-y-1">
                {filtered.map((r: Recipe) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      aria-current={selected?.id === r.id ? 'true' : undefined}
                      className={`w-full rounded-lg px-2.5 py-2 text-left text-sm ${
                        selected?.id === r.id ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="font-semibold text-foreground">{r.name.zh}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {r.domain} · {r.station}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="order-1 lg:order-2">
          <CardContent className="space-y-4 pt-6">
            {catalog.isLoading || !selected ? (
              catalog.isError ? (
                <EmptyState title="沒有可顯示的配方" description="目錄載入失敗。" />
              ) : (
                <div className="space-y-3">
                  <Skeleton className="h-7 w-1/2" />
                  <Skeleton className="h-24 w-full" />
                  <p className="text-sm text-muted-foreground">載入配方…</p>
                </div>
              )
            ) : (
              <>
                <div>
                  <h2 className="text-title font-semibold">{selected.name.zh}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selected.name.en} · {selected.process}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/50 py-4">
                  {selected.inputs.map((line) => {
                    const s = byId[line.substanceId];
                    return (
                      <SchematicChip
                        key={line.substanceId + 'i'}
                        label={s?.name.zh ?? line.substanceId}
                        sub={String(line.qty)}
                        color={ICON_COLOR[s?.kind ?? ''] ?? 'var(--muted-foreground)'}
                      />
                    );
                  })}
                  <div className="px-2 font-mono text-sm text-muted-foreground">→ {selected.station} →</div>
                  {selected.outputs.map((line) => {
                    const s = byId[line.substanceId];
                    return (
                      <SchematicChip
                        key={line.substanceId + 'o'}
                        label={s?.name.zh ?? line.substanceId}
                        sub={`${line.qty}×${line.yield ?? 1}`}
                        color={ICON_COLOR[s?.kind ?? ''] ?? 'var(--muted-foreground)'}
                      />
                    );
                  })}
                </div>
                <div className="rounded-xl bg-foreground p-4 text-sm leading-relaxed text-background">
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-primary-foreground/80">Science</div>
                  <p>{selected.science.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selected.science.mechanisms.map((m) => (
                      <span key={m} className="rounded-md bg-background/20 px-2 py-0.5 text-[10px] text-background">
                        {m}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-background/70">簡化：{selected.science.approxRealism}</p>
                </div>

                {job ? (
                  <div className="space-y-1.5">
                    <div
                      className="h-2 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(progress * 100)}
                      aria-label="提煉進度"
                    >
                      <div
                        className="h-full bg-primary motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-linear"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      進行中：<b className="text-foreground">{job.recipeId}</b>
                      {ready ? ' — 可收取' : ` — 剩餘 ${(remainMs / 1000).toFixed(1)}s`}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="flex-1"
                    disabled={!!job || startMut.isPending}
                    onClick={() => selected && startMut.mutate(selected.id)}
                  >
                    開始提煉（{demoSec}s{MODE === 'local' && selected.durationSec > demoSec ? ' · demo' : ''}）
                  </Button>
                  <Button
                    className="flex-1"
                    variant="secondary"
                    disabled={!ready || completeMut.isPending}
                    onClick={() => completeMut.mutate()}
                  >
                    完成收取
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="order-3 max-h-[40vh] overflow-auto lg:max-h-[70vh]">
          <CardHeader>
            <CardTitle className="text-sm">庫存</CardTitle>
          </CardHeader>
          <CardContent>
            {inventory.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : inventory.isError ? (
              <p className="text-sm text-muted-foreground">庫存讀取失敗。</p>
            ) : !stockRows.length ? (
              <EmptyState
                className="py-6"
                title="庫存是空的"
                description="按「重置庫存」還原種子資料。"
                action={
                  <Button size="sm" type="button" onClick={() => resetMut.mutate()}>
                    重置庫存
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-1 text-xs">
                {stockRows.map(([id, q]) => (
                  <li
                    key={id}
                    className={`flex justify-between gap-2 border-b border-dashed border-border px-1 py-0.5 ${
                      flashIds.has(id) ? 'bg-secondary text-foreground' : ''
                    }`}
                  >
                    <span>{byId[id]?.name.zh ?? id}</span>
                    <span className="font-semibold tabular-nums">{q}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      <footer className="px-4 py-5 text-center text-xs text-muted-foreground">
        示意圖 demo · 重整頁面庫存仍保留 · 遠端模式加 <code className="font-mono">?api=1</code>
      </footer>
    </StationShell>
  );
}

boot(
  <QueryClientProvider client={qc}>
    <Atelier />
  </QueryClientProvider>,
);
