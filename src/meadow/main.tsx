import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';

type Row = { id: number; label: string; val: number; species: string };
const SPECIES = ['🌷', '🌻', '🌸', '🌹', '🌼'];
const ROW_H = 38;

function build(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i, label: `花圃 #${1000 + i}`, val: Math.floor(Math.random() * 100), species: SPECIES[i % SPECIES.length],
  }));
}

function Meadow() {
  const [count, setCount] = useState(50000);
  const [mode, setMode] = useState<'virtual' | 'naive'>('virtual');
  const [scrollTop, setScrollTop] = useState(0);
  const [fps, setFps] = useState(60);
  const [leakN, setLeakN] = useState(0);
  const [leakOn, setLeakOn] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<Row[]>(build(50000));
  const leakTimer = useRef<number | null>(null);
  const leaks = useRef<string[][]>([]);

  useEffect(() => { dataRef.current = build(count); if (listRef.current) listRef.current.scrollTop = 0; setScrollTop(0); }, [count]);

  // FPS 儀表
  useEffect(() => {
    let frames = 0, t = performance.now(), raf = 0;
    const tick = (now: number) => { frames++; if (now - t >= 500) { setFps(Math.round((frames * 1000) / (now - t))); frames = 0; t = now; } raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const data = dataRef.current;
  const H = 380;
  const start = mode === 'virtual' ? Math.max(0, Math.floor(scrollTop / ROW_H) - 5) : 0;
  const end = mode === 'virtual' ? Math.min(data.length, Math.ceil((scrollTop + H) / ROW_H) + 5) : data.length;
  const visible = data.slice(start, end);

  function startLeak() {
    if (leakTimer.current) return;
    setLeakOn(true);
    leakTimer.current = window.setInterval(() => {
      leaks.current.push(new Array(200000).fill('leak')); // ~1.6MB/次，永不釋放
      setLeakN((n) => n + 1);
      document.addEventListener('mousemove', () => leaks.current.length); // 故意不移除的 listener
    }, 1000);
  }
  function stopLeak() {
    if (leakTimer.current) clearInterval(leakTimer.current);
    leakTimer.current = null; leaks.current = []; setLeakN(0); setLeakOn(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-leaf-50 to-white text-soil-900">
      <div className="fixed top-3 right-4 text-sm bg-white/80 border border-leaf-100 rounded-lg px-3 py-1.5 shadow-sm">
        FPS <b className={`tabular-nums ${fps < 40 ? 'text-rose-500' : 'text-leaf-600'}`}>{fps}</b> · 節點 <b className="tabular-nums">{mode === 'virtual' ? visible.length : data.length}</b>
      </div>
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-xl font-bold">花圃效能實驗室</h1>
        <p className="text-sm text-slate-500 mt-1">同一份資料：全量渲染 vs 虛擬列表 · 即時 FPS · 記憶體洩漏示範</p>

        <div className="flex flex-wrap gap-2.5 items-center my-4">
          <button onClick={() => setMode('naive')} className={`px-4 py-2 rounded-lg border text-sm ${mode === 'naive' ? 'bg-leaf-500 text-white border-leaf-500' : 'bg-white border-leaf-100'}`}>全量渲染（卡頓）</button>
          <button onClick={() => setMode('virtual')} className={`px-4 py-2 rounded-lg border text-sm ${mode === 'virtual' ? 'bg-leaf-500 text-white border-leaf-500' : 'bg-white border-leaf-100'}`}>虛擬列表（流暢）</button>
          <span className="text-xs text-slate-400 ml-2">資料量</span>
          {[5000, 20000, 50000].map((n) => (
            <button key={n} onClick={() => setCount(n)} className={`px-3 py-2 rounded-lg border text-sm ${count === n ? 'bg-leaf-100 border-leaf-300 text-leaf-700' : 'bg-white border-leaf-100'}`}>{n / 1000}k</button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-2xl bg-white border border-leaf-100 p-4 shadow-sm">
            <h3 className="font-bold text-sm mb-1">列表渲染</h3>
            <p className="text-xs text-slate-500 mb-2">
              {mode === 'virtual' ? '虛擬列表：只渲染可視範圍約 30 個節點。' : `全量渲染：一次塞入 ${data.length.toLocaleString()} 個節點，捲動 FPS 明顯下降。`}
            </p>
            <div ref={listRef} onScroll={(e) => mode === 'virtual' && setScrollTop((e.target as HTMLDivElement).scrollTop)}
              className="h-[380px] overflow-auto border border-leaf-100 rounded-xl bg-leaf-50/40 relative">
              <div style={{ height: mode === 'virtual' ? data.length * ROW_H : 'auto' }}>
                {visible.map((r) => (
                  <div key={r.id}
                    style={mode === 'virtual' ? { position: 'absolute', top: r.id * ROW_H, left: 0, right: 0, height: ROW_H } : { height: ROW_H }}
                    className="flex items-center justify-between px-3 border-b border-leaf-100 text-[13px]">
                    <span>{r.species} {r.label}</span>
                    <span className="h-1.5 rounded bg-gradient-to-r from-leaf-500 to-emerald-400" style={{ width: r.val }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-leaf-100 p-4 shadow-sm">
            <h3 className="font-bold text-sm mb-1">記憶體洩漏示範</h3>
            <p className="text-xs text-slate-500 mb-3">每秒把大陣列 push 進未清除的參照並掛上不移除的 listener。開 DevTools › Memory 觀察 Heap 成長。</p>
            <div className="flex gap-2.5">
              <button onClick={startLeak} className="px-4 py-2 rounded-lg border border-rose-100 bg-rose-50 text-rose-500 text-sm">開始洩漏</button>
              <button onClick={stopLeak} className="px-4 py-2 rounded-lg border border-leaf-100 bg-white text-sm">停止並清除</button>
            </div>
            <div className="text-[13px] text-slate-500 mt-3 border-t border-dashed border-leaf-100 pt-3">
              已洩漏區塊 <b className="text-soil-900 tabular-nums">{leakN}</b> · 估計 <b className="text-soil-900 tabular-nums">{(leakN * 1.6).toFixed(1)}</b> MB<br />
              <span className={leakOn ? 'text-rose-500' : 'text-leaf-600'}>{leakOn ? '洩漏中…（Heap 持續成長）' : '閒置 / 已清除'}</span>
              <p className="mt-2 text-slate-500"><b className="text-rose-500">面試重點</b>：常見洩漏＝未清 timer、未移除 listener、閉包持大物件、全域快取、detached DOM；React 則是 effect 沒回傳 cleanup。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Meadow />);
