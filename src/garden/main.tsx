import React, { useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
} from '@is_tess/components';
import { useSocket } from '../lib/useSocket';
import { useGarden, type Plant } from '../lib/store';
import { fetchLeaderboard } from '../lib/api';
import { StationShell, boot } from '../lib/shell';
import '../index.css';

const qc = new QueryClient();
const SPECIES: Record<string, string[]> = {
  tulip: ['🌱', '🌿', '🌷'],
  sunflower: ['🌱', '🌿', '🌻'],
  cherry: ['🌱', '🌿', '🌸'],
  rose: ['🌱', '🌿', '🌹'],
};
const WATER_COST = 5;

type FeedItem = { id: number; text: string; tone: 'ok' | 'warn' | 'muted' };

function stageEmoji(p: Plant) {
  const arr = SPECIES[p.species] ?? SPECIES.tulip;
  return p.blooming ? arr[2] : arr[Math.min(p.stage, 1)];
}

function Feed({ items }: { items: FeedItem[] }) {
  if (!items.length) {
    return <p className="border-t border-dashed border-border pt-3 text-sm text-muted-foreground">尚無動態。點花圃格子澆水，或等伺服器隨機綻放。</p>;
  }
  return (
    <div className="h-52 space-y-0.5 overflow-auto border-t border-dashed border-border pt-2.5 text-sm">
      {items.map((t) => (
        <div
          key={t.id}
          className={
            t.tone === 'ok'
              ? 'text-foreground'
              : t.tone === 'warn'
                ? 'text-destructive'
                : 'text-muted-foreground'
          }
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

function Leaderboard() {
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
    refetchInterval: 8000,
    retry: 1,
  });
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">熱門花園排行</CardTitle>
          <span className="text-xs text-muted-foreground">{isFetching ? '更新中…' : '8 秒輪詢'}</span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : isError ? (
          <EmptyState
            className="py-6"
            title="排行榜載入失敗"
            description="花園服務的 REST 排行無法連線。確認此站已從控制台啟動。"
            action={
              <Button size="sm" type="button" onClick={() => refetch()}>
                重試
              </Button>
            }
          />
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">目前沒有排行資料。</p>
        ) : (
          <ol className="space-y-1.5">
            {data.map((r, i) => (
              <li key={r.name} className="flex items-center justify-between text-sm">
                <span>
                  <b className="text-foreground">{i + 1}.</b> {r.name}{' '}
                  <span className="text-muted-foreground">· {r.area}</span>
                </span>
                <span className="font-semibold tabular-nums">{r.blooms} 朵</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function Garden() {
  const { water, plants, spend, setPlants, upsertPlant } = useGarden();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [round, setRound] = useState(0);
  const [live, setLive] = useState('');
  const seq = useRef(0);
  const log = (text: string, tone: FeedItem['tone'] = 'muted') => {
    seq.current += 1;
    setFeed((f) => [{ id: seq.current, text, tone }, ...f].slice(0, 60));
  };

  const { status, send } = useSocket('/ws', (m) => {
    if (m.type === 'hello') {
      setPlants(m.plants);
      setRound(m.round);
    } else if (m.type === 'grow') {
      upsertPlant(m.plant);
    } else if (m.type === 'bloom') {
      upsertPlant(m.plant);
      setRound(m.round);
      const text = `第 ${m.round} 輪：${m.plant.id} 號綻放了`;
      log(text, 'ok');
      setLive(text);
    } else if (m.type === 'water-ack') {
      upsertPlant(m.plant);
    }
  });

  const list = Object.values(plants).sort((a, b) => a.id - b.id);

  function water1(p: Plant) {
    if (!spend(WATER_COST)) {
      log('水滴不足', 'warn');
      setLive('水滴不足');
      return;
    }
    upsertPlant({ ...p, stage: Math.min(p.stage + 1, 2) });
    log(`你澆了 ${p.id} 號（樂觀 +1 階）`, 'ok');
    send({ type: 'water', id: p.id });
  }

  return (
    <StationShell
      title="共享花園（即時）"
      description="WebSocket · 心跳重連 · 樂觀澆水 · 不是多人線上遊戲產品"
      conn={status}
      live={live}
    >
      <div className="grid gap-5 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                水滴 <b className="text-title tabular-nums text-foreground">{water}</b> · 第{' '}
                <b className="tabular-nums text-foreground">{round}</b> 輪
              </p>
              <p className="text-xs text-muted-foreground">伺服器每 6 秒隨機一株綻放</p>
            </div>
          </CardHeader>
          <CardContent>
            {status === 'connecting' && !list.length ? (
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(64px,1fr))' }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl" />
                ))}
              </div>
            ) : !list.length ? (
              <EmptyState
                title="還沒有植株"
                description="連上花園服務後會出現花圃。請從控制台啟動「共享花園」。"
              />
            ) : (
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(64px,1fr))' }}>
                {list.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => water1(p)}
                    aria-label={`澆水：${p.id} 號${p.blooming ? '，綻放中' : ''}`}
                    className={`flex aspect-square flex-col items-center justify-center rounded-xl border text-3xl transition ${
                      p.blooming
                        ? 'border-primary bg-secondary motion-safe:animate-pulse'
                        : 'border-border bg-muted hover:bg-secondary'
                    }`}
                  >
                    <span aria-hidden>{stageEmoji(p)}</span>
                    <span className="mt-0.5 text-[10px] text-muted-foreground">{p.id}</span>
                  </button>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              點格子澆水：前端先樂觀扣水並長大一階，再等伺服器 water-ack 校正。斷線會指數退避重連。
            </p>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Leaderboard />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">即時動態</CardTitle>
            </CardHeader>
            <CardContent>
              <Feed items={feed} />
            </CardContent>
          </Card>
        </div>
      </div>
    </StationShell>
  );
}

boot(
  <QueryClientProvider client={qc}>
    <Garden />
  </QueryClientProvider>,
);
