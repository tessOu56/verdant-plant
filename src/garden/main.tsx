import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useSocket } from '../lib/useSocket';
import { useGarden, type Plant } from '../lib/store';
import { fetchLeaderboard } from '../lib/api';
import '../index.css';

const qc = new QueryClient();
const SPECIES: Record<string, string[]> = {
  tulip: ['🌱', '🌿', '🌷'],
  sunflower: ['🌱', '🌿', '🌻'],
  cherry: ['🌱', '🌿', '🌸'],
  rose: ['🌱', '🌿', '🌹'],
};
const WATER_COST = 5;

function stageEmoji(p: Plant) {
  const arr = SPECIES[p.species] ?? SPECIES.tulip;
  return p.blooming ? arr[2] : arr[Math.min(p.stage, 1)];
}

function Feed({ items }: { items: string[] }) {
  return (
    <div className="h-52 overflow-auto text-[12.5px] border-t border-dashed border-leaf-100 pt-2.5 space-y-0.5">
      {items.map((t, i) => <div key={i} className="text-slate-500" dangerouslySetInnerHTML={{ __html: t }} />)}
    </div>
  );
}

function Leaderboard() {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['leaderboard'], queryFn: fetchLeaderboard, refetchInterval: 8000,
  });
  return (
    <div className="rounded-2xl bg-white border border-leaf-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm">熱門花園排行</h3>
        <span className="text-[11px] text-slate-400">{isFetching ? '更新中…' : 'TanStack Query · 8s'}</span>
      </div>
      {isLoading ? <p className="text-sm text-slate-400">載入中…</p> : (
        <ol className="space-y-1.5">
          {data!.map((r, i) => (
            <li key={r.name} className="flex items-center justify-between text-[13px]">
              <span><b className="text-leaf-700">{i + 1}.</b> {r.name} <span className="text-slate-400">· {r.area}</span></span>
              <span className="tabular-nums text-bloom-500 font-semibold">{r.blooms} 朵</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Garden() {
  const { water, plants, spend, setPlants, upsertPlant } = useGarden();
  const [feed, setFeed] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const log = (t: string) => setFeed((f) => [t, ...f].slice(0, 60));

  const { status, send } = useSocket('/ws', (m) => {
    if (m.type === 'hello') { setPlants(m.plants); setRound(m.round); }
    else if (m.type === 'grow') { upsertPlant(m.plant); }
    else if (m.type === 'bloom') { upsertPlant(m.plant); setRound(m.round); log(`🌸 第 ${m.round} 輪：<b style="color:#ec4899">${m.plant.id} 號</b> 綻放了！`); }
    else if (m.type === 'water-ack') { upsertPlant(m.plant); } // 伺服器校正
  });

  const list = Object.values(plants).sort((a, b) => a.id - b.id);

  function water1(p: Plant) {
    if (!spend(WATER_COST)) { log('💧 水滴不足'); return; }
    // 樂觀更新：先讓它長大一階
    upsertPlant({ ...p, stage: Math.min(p.stage + 1, 2) });
    log(`<span style="color:#63a844">你澆了 ${p.id} 號（樂觀 +1 階）</span>`);
    send({ type: 'water', id: p.id });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-leaf-50 text-soil-900">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">共享花園（即時）</h1>
            <p className="text-sm text-slate-500">WebSocket 即時資料流 · 心跳重連 · 樂觀澆水 · Zustand 狀態 · TanStack Query 排行</p>
          </div>
          <div className="text-sm flex items-center gap-2 text-slate-500">
            <span className={`w-2.5 h-2.5 rounded-full ${status === 'open' ? 'bg-leaf-500 animate-pulse' : 'bg-rose-400'}`} />
            {status === 'open' ? '即時中' : '重連中…'}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mt-5">
          <div className="md:col-span-2 rounded-2xl bg-white border border-leaf-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-slate-500">水滴 <b className="text-sky-500 text-lg tabular-nums">{water}</b> · 第 <b className="tabular-nums">{round}</b> 輪</div>
              <div className="text-[12px] text-slate-400">每 6 秒隨機一株綻放</div>
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(64px,1fr))' }}>
              {list.map((p) => (
                <button key={p.id} onClick={() => water1(p)} title={`澆水 -${WATER_COST}`}
                  className={`aspect-square rounded-xl border flex flex-col items-center justify-center text-3xl transition
                    ${p.blooming ? 'border-bloom-300 bg-bloom-300/10 animate-pulse' : 'border-leaf-100 bg-leaf-50 hover:bg-leaf-100'}`}>
                  <span>{stageEmoji(p)}</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">{p.id}</span>
                </button>
              ))}
            </div>
            <p className="text-[11.5px] text-slate-400 mt-3 leading-relaxed">
              點花圃格子澆水：前端先「樂觀」扣水滴並長大一階，再等伺服器 <code>water-ack</code> 校正；斷線會指數退避自動重連。
            </p>
          </div>

          <div className="space-y-5">
            <Leaderboard />
            <div className="rounded-2xl bg-white border border-leaf-100 p-4 shadow-sm">
              <h3 className="font-bold text-sm mb-1">即時動態</h3>
              <Feed items={feed} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={qc}><Garden /></QueryClientProvider>
);
