import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import '../index.css';

type Domain = 'alchemy' | 'kitchen' | 'physics' | 'all';
type Localized = { zh: string; en: string };
type Substance = { id: string; name: Localized; kind: string; formula: string | null; icon: string; traits: string[] };
type Recipe = {
  id: string; domain: Exclude<Domain, 'all'>; name: Localized; station: string; process: string;
  inputs: { substanceId: string; qty: number }[];
  outputs: { substanceId: string; qty: number; yield?: number }[];
  durationSec: number; heat: string; icon: string;
  science: { summary: string; mechanisms: string[]; keywords: string[]; approxRealism: string };
};
type CraftJob = { recipeId: string; startedAt: number; readyAt: number; pendingOutputs: { substanceId: string; qty: number }[] };

const qc = new QueryClient();
const DOMAINS: { id: Domain; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'alchemy', label: '鍊金' },
  { id: 'kitchen', label: '廚房' },
  { id: 'physics', label: '物理' },
];

const ICON_COLOR: Record<string, string> = {
  mineral: '#64748b', plant: '#16a34a', element: '#b45309', alloy: '#a16207',
  food: '#ca8a04', food_product: '#d97706', solution: '#0284c7', phase: '#7dd3fc',
  extract: '#15803d', compound: '#94a3b8', element_carrier: '#1e293b', element_compound: '#0ea5e9',
};

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function SchematicChip({ label, sub, color }: { label: string; sub?: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[72px]">
      <div className="w-12 h-12 rounded-xl border-2 border-dashed grid place-items-center text-[10px] font-mono text-white"
        style={{ background: color, borderColor: color }}>{label.slice(0, 4)}</div>
      <span className="text-[11px] text-center text-slate-600 leading-tight max-w-[80px]">{label}</span>
      {sub && <span className="text-[10px] text-slate-400 tabular-nums">×{sub}</span>}
    </div>
  );
}

function Atelier() {
  const client = useQueryClient();
  const [domain, setDomain] = useState<Domain>('all');
  const [selectedId, setSelectedId] = useState<string | null>('smelt_copper');
  const [now, setNow] = useState(Date.now());
  const [err, setErr] = useState<string | null>(null);

  const catalog = useQuery({
    queryKey: ['atelier-catalog'],
    queryFn: () => getJson<{ substances: Substance[]; recipes: Recipe[] }>('/api/atelier/catalog'),
  });
  const inventory = useQuery({
    queryKey: ['atelier-inventory'],
    queryFn: () => getJson<{ stock: Record<string, number> }>('/api/atelier/inventory'),
    refetchInterval: 2000,
  });
  const craft = useQuery({
    queryKey: ['atelier-craft'],
    queryFn: () => getJson<{ job: CraftJob | null }>('/api/atelier/craft'),
    refetchInterval: 500,
  });

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const substances = catalog.data?.substances ?? [];
  const recipes = catalog.data?.recipes ?? [];
  const stock = inventory.data?.stock ?? {};
  const job = craft.data?.job ?? null;
  const byId = useMemo(() => Object.fromEntries(substances.map((s) => [s.id, s])), [substances]);
  const filtered = recipes.filter((r) => domain === 'all' || r.domain === domain);
  const selected = recipes.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  const startMut = useMutation({
    mutationFn: async (recipeId: string) => {
      const r = await fetch('/api/atelier/craft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || 'craft failed');
      return body;
    },
    onSuccess: () => { setErr(null); client.invalidateQueries(); },
    onError: (e: Error) => setErr(e.message),
  });
  const completeMut = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/atelier/craft/complete', { method: 'POST' });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || 'complete failed');
      return body;
    },
    onSuccess: () => { setErr(null); client.invalidateQueries(); },
    onError: (e: Error) => setErr(e.message),
  });
  const resetMut = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/atelier/inventory/reset', { method: 'POST' });
      if (!r.ok) throw new Error('reset failed');
      return r.json();
    },
    onSuccess: () => { setErr(null); client.invalidateQueries(); },
  });

  const remainMs = job ? Math.max(0, job.readyAt - now) : 0;
  const ready = job && remainMs === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-stone-50 to-slate-100 text-soil-900">
      <header className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-white/80 backdrop-blur">
        <div>
          <h1 className="text-lg font-bold tracking-wide">Atelier 鍊金工坊</h1>
          <p className="text-xs text-slate-500">Substance · Recipe · 科學背景示意 · alchemy / kitchen / physics</p>
        </div>
        <button onClick={() => resetMut.mutate()} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
          重置庫存
        </button>
      </header>

      <div className="flex flex-wrap gap-2 px-6 py-3 border-b border-amber-100/80 bg-white/50">
        {DOMAINS.map((d) => (
          <button key={d.id} onClick={() => setDomain(d.id)}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${domain === d.id ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-slate-600 border-slate-200'}`}>
            {d.label}
          </button>
        ))}
      </div>

      {err && <div className="mx-6 mt-3 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{err}</div>}

      <main className="p-6 grid gap-5 lg:grid-cols-[240px_1fr_220px]">
        <section className="rounded-2xl bg-white border border-amber-100 p-3 shadow-sm max-h-[70vh] overflow-auto">
          <h2 className="text-sm font-bold mb-2">配方</h2>
          <ul className="space-y-1">
            {filtered.map((r) => (
              <li key={r.id}>
                <button onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left text-[13px] px-2.5 py-2 rounded-lg ${selected?.id === r.id ? 'bg-amber-100 text-amber-950' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <div className="font-semibold">{r.name.zh}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide">{r.domain} · {r.station}</div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl bg-white border border-amber-100 p-5 shadow-sm space-y-4">
          {catalog.isLoading || !selected ? (
            <p className="text-slate-400 text-sm">載入配方…</p>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-bold">{selected.name.zh}</h2>
                <p className="text-xs text-slate-400">{selected.name.en} · {selected.process}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 py-4 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                {selected.inputs.map((line) => {
                  const s = byId[line.substanceId];
                  return <SchematicChip key={line.substanceId + 'i'} label={s?.name.zh ?? line.substanceId}
                    sub={String(line.qty)} color={ICON_COLOR[s?.kind ?? ''] ?? '#78716c'} />;
                })}
                <div className="text-slate-400 text-sm font-mono px-2">→ {selected.station} →</div>
                {selected.outputs.map((line) => {
                  const s = byId[line.substanceId];
                  return <SchematicChip key={line.substanceId + 'o'} label={s?.name.zh ?? line.substanceId}
                    sub={`${line.qty}×${line.yield ?? 1}`} color={ICON_COLOR[s?.kind ?? ''] ?? '#78716c'} />;
                })}
              </div>
              <div className="rounded-xl bg-slate-900 text-slate-100 p-4 text-sm leading-relaxed">
                <div className="text-[11px] uppercase tracking-wider text-amber-300/90 mb-1">Science</div>
                <p>{selected.science.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selected.science.mechanisms.map((m) => (
                    <span key={m} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-700 text-amber-100">{m}</span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">簡化：{selected.science.approxRealism}</p>
                <p className="mt-1 text-[11px] text-slate-500">關鍵詞：{selected.science.keywords.join(' · ')}</p>
              </div>
              <div className="flex gap-2">
                <button disabled={!!job || startMut.isPending} onClick={() => selected && startMut.mutate(selected.id)}
                  className="flex-1 rounded-xl py-2.5 font-bold text-sm bg-amber-700 text-white disabled:opacity-40 hover:bg-amber-800">
                  開始提煉（{selected.durationSec}s）
                </button>
                <button disabled={!ready || completeMut.isPending} onClick={() => completeMut.mutate()}
                  className="flex-1 rounded-xl py-2.5 font-bold text-sm bg-emerald-600 text-white disabled:opacity-40 hover:bg-emerald-700">
                  完成收取
                </button>
              </div>
              {job && (
                <p className="text-xs text-slate-500">
                  進行中：<b>{job.recipeId}</b>
                  {ready ? ' — 可收取' : ` — 剩餘 ${(remainMs / 1000).toFixed(1)}s`}
                </p>
              )}
            </>
          )}
        </section>

        <section className="rounded-2xl bg-white border border-amber-100 p-3 shadow-sm max-h-[70vh] overflow-auto">
          <h2 className="text-sm font-bold mb-2">庫存</h2>
          <ul className="space-y-1 text-[12px]">
            {Object.entries(stock)
              .filter(([, q]) => q > 0)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([id, q]) => (
                <li key={id} className="flex justify-between gap-2 px-1 py-0.5 border-b border-dashed border-slate-100">
                  <span>{byId[id]?.name.zh ?? id}</span>
                  <span className="tabular-nums font-semibold">{q}</span>
                </li>
              ))}
          </ul>
        </section>
      </main>
      <footer className="text-center text-xs text-slate-400 py-5">示意圖 placeholder · 精美圖稍後換 icon asset map</footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={qc}><Atelier /></QueryClientProvider>
);
