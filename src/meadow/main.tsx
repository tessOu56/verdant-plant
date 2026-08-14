import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VirtualList } from '@is_tess/components';
import '@is_tess/tokens/css/verdant.css';
import '../index.css';

type Row = { id: number; label: string; val: number; species: string };
const SPECIES = ['🌷', '🌻', '🌸', '🌹', '🌼'];
const ROW_H = 38;

function build(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    label: `花圃 #${1000 + i}`,
    val: Math.floor(Math.random() * 100),
    species: SPECIES[i % SPECIES.length],
  }));
}

function RowView({ r }: { r: Row }) {
  return (
    <div className="flex h-full items-center justify-between border-b border-leaf-100 px-3 text-[13px]">
      <span>
        {r.species} {r.label}
      </span>
      <span
        className="h-1.5 rounded bg-gradient-to-r from-leaf-500 to-emerald-400"
        style={{ width: r.val }}
      />
    </div>
  );
}

function Meadow() {
  const [count, setCount] = useState(50000);
  const [mode, setMode] = useState<'virtual' | 'naive'>('virtual');
  const [fps, setFps] = useState(60);
  const [leakN, setLeakN] = useState(0);
  const [leakOn, setLeakOn] = useState(false);
  const dataRef = useRef<Row[]>(build(50000));
  const leakTimer = useRef<number | null>(null);
  const leaks = useRef<string[][]>([]);

  useEffect(() => {
    dataRef.current = build(count);
  }, [count]);

  useEffect(() => {
    let frames = 0,
      t = performance.now(),
      raf = 0;
    const tick = (now: number) => {
      frames++;
      if (now - t >= 500) {
        setFps(Math.round((frames * 1000) / (now - t)));
        frames = 0;
        t = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const data = dataRef.current;
  const H = 380;

  function startLeak() {
    if (leakTimer.current) return;
    setLeakOn(true);
    leakTimer.current = window.setInterval(() => {
      leaks.current.push(new Array(200000).fill('leak'));
      setLeakN((n) => n + 1);
      document.addEventListener('mousemove', () => leaks.current.length);
    }, 1000);
  }
  function stopLeak() {
    if (leakTimer.current) clearInterval(leakTimer.current);
    leakTimer.current = null;
    leaks.current = [];
    setLeakN(0);
    setLeakOn(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-leaf-50 to-white text-soil-900" data-app="verdant">
      <div className="fixed top-3 right-4 rounded-lg border border-leaf-100 bg-white/80 px-3 py-1.5 text-sm shadow-sm">
        FPS{' '}
        <b className={`tabular-nums ${fps < 40 ? 'text-rose-500' : 'text-leaf-600'}`}>{fps}</b>
      </div>
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="text-xl font-bold">花圃效能實驗室</h1>
        <p className="mt-1 text-sm text-slate-500">
          全量渲染 vs <code>@is_tess/components</code> VirtualList · 即時 FPS · 記憶體洩漏示範
        </p>

        <div className="my-4 flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setMode('naive')}
            className={`rounded-lg border px-4 py-2 text-sm ${mode === 'naive' ? 'border-leaf-500 bg-leaf-500 text-white' : 'border-leaf-100 bg-white'}`}
          >
            全量渲染（卡頓）
          </button>
          <button
            onClick={() => setMode('virtual')}
            className={`rounded-lg border px-4 py-2 text-sm ${mode === 'virtual' ? 'border-leaf-500 bg-leaf-500 text-white' : 'border-leaf-100 bg-white'}`}
          >
            VirtualList（流暢）
          </button>
          <span className="ml-2 text-xs text-slate-400">資料量</span>
          {[5000, 20000, 50000].map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className={`rounded-lg border px-3 py-2 text-sm ${count === n ? 'border-leaf-300 bg-leaf-100 text-leaf-700' : 'border-leaf-100 bg-white'}`}
            >
              {n / 1000}k
            </button>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-leaf-100 bg-white p-4 shadow-sm">
            <h3 className="mb-1 text-sm font-bold">列表渲染</h3>
            <p className="mb-2 text-xs text-slate-500">
              {mode === 'virtual'
                ? 'VirtualList：只掛可視窗列。'
                : `全量渲染：一次塞入 ${data.length.toLocaleString()} 節點。`}
            </p>
            {mode === 'virtual' ? (
              <VirtualList
                items={data}
                height={H}
                estimateSize={ROW_H}
                className="rounded-xl border border-leaf-100 bg-leaf-50/40"
                getItemKey={(r) => r.id}
                renderItem={(r) => <RowView r={r} />}
              />
            ) : (
              <div className="relative h-[380px] overflow-auto rounded-xl border border-leaf-100 bg-leaf-50/40">
                {data.map((r) => (
                  <div key={r.id} style={{ height: ROW_H }}>
                    <RowView r={r} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-leaf-100 bg-white p-4 shadow-sm">
            <h3 className="mb-1 text-sm font-bold">記憶體洩漏示範</h3>
            <p className="mb-3 text-xs text-slate-500">
              每秒 push 大陣列並掛上不移除的 listener。開 DevTools › Memory 觀察 Heap。
            </p>
            <div className="flex gap-2.5">
              <button onClick={startLeak} className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-500">
                開始洩漏
              </button>
              <button onClick={stopLeak} className="rounded-lg border border-leaf-100 bg-white px-4 py-2 text-sm">
                停止並清除
              </button>
            </div>
            <div className="mt-3 border-t border-dashed border-leaf-100 pt-3 text-[13px] text-slate-500">
              已洩漏區塊 <b className="tabular-nums text-soil-900">{leakN}</b> · 估計{' '}
              <b className="tabular-nums text-soil-900">{(leakN * 1.6).toFixed(1)}</b> MB
              <br />
              <span className={leakOn ? 'text-rose-500' : 'text-leaf-600'}>
                {leakOn ? '洩漏中…' : '閒置 / 已清除'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

document.documentElement.setAttribute('data-app', 'verdant');
createRoot(document.getElementById('root')!).render(<Meadow />);
