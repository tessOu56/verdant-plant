import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { fetchServices, type ServiceInfo } from '../lib/api';
import { useSocket } from '../lib/useSocket';
import '../index.css';

const qc = new QueryClient();

function fmtUptime(ms: number) {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
  if (h) return `${h}h ${m % 60}m`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
const LABEL: Record<string, string> = { running: '運行中', stopped: '已停止', starting: '啟動中…', stopping: '停止中…' };
const BADGE: Record<string, string> = {
  running: 'bg-leaf-100 text-leaf-700 ring-leaf-300',
  stopped: 'bg-slate-100 text-slate-500 ring-slate-200',
  starting: 'bg-amber-100 text-amber-700 ring-amber-300',
  stopping: 'bg-amber-100 text-amber-700 ring-amber-300',
};

async function act(id: string, action: 'start' | 'stop') {
  await fetch(`/api/services/${id}/${action}`, { method: 'POST' });
}

function Dashboard() {
  const initial = useQuery({ queryKey: ['services'], queryFn: fetchServices });
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const { status } = useSocket('/ws', (msg) => { if (msg.type === 'snapshot') setServices(msg.services); });

  useEffect(() => { if (initial.data && services.length === 0) setServices(initial.data.services); }, [initial.data]);

  const running = services.filter((s) => s.status === 'running').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-leaf-50 to-emerald-50 text-soil-900">
      <header className="flex items-center justify-between px-8 py-6 border-b border-leaf-100 bg-white/70 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-leaf-500 to-emerald-400 grid place-items-center text-2xl shadow-lg shadow-leaf-500/30">🌿</div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">Verdant 花草產品體系控制台</h1>
            <p className="text-xs text-leaf-700/70">即時狀態 · 指定啟動服務 · React + TS + Tailwind + Zustand + TanStack Query</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className={`w-2.5 h-2.5 rounded-full ${status === 'open' ? 'bg-leaf-500 animate-pulse' : 'bg-rose-400'}`} />
          {status === 'open' ? '即時連線中' : '重連中…'}
        </div>
      </header>

      <div className="px-8 py-3 text-sm text-slate-500 border-b border-leaf-100 flex gap-6 flex-wrap bg-white/40">
        <span>運行中 <b className="text-soil-900">{running}</b> / <b className="text-soil-900">{services.length}</b></span>
        <span>狀態經 <b className="text-soil-900">TCP 健康檢查</b> 每 2s 廣播</span>
        <span>{initial.isLoading ? '載入服務清單…' : `最後更新 ${new Date().toLocaleTimeString('zh-TW')}`}</span>
      </div>

      <main className="p-8 grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))' }}>
        {services.map((s) => (
          <div key={s.id} className="relative rounded-2xl bg-white border border-leaf-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: s.accent }} />
            <div className="flex items-center justify-between gap-2">
              <div className="text-lg font-bold">{s.name}</div>
              <span className={`text-xs px-2.5 py-1 rounded-full ring-1 font-semibold ${BADGE[s.status] ?? BADGE.stopped}`}>
                {LABEL[s.status] ?? s.status}
              </span>
            </div>
            <div className="text-[13px] mt-2" style={{ color: s.accent }}>{s.role}</div>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed min-h-[60px]">{s.desc}</p>
            <div className="flex flex-wrap gap-1.5 my-3">
              {s.tags.map((t) => <span key={t} className="text-[11px] text-leaf-700 bg-leaf-50 border border-leaf-100 px-2 py-0.5 rounded-md">{t}</span>)}
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs text-slate-500 pt-3 border-t border-dashed border-leaf-100">
              <span>連接埠 <b className="text-soil-900 tabular-nums">:{s.port}</b></span>
              <span>PID <b className="text-soil-900 tabular-nums">{s.pid ?? '—'}</b></span>
              <span>運行時間 <b className="text-soil-900 tabular-nums">{fmtUptime(s.uptime)}</b></span>
              <span>可達性 <b className="text-soil-900">{s.status === 'running' ? (s.reachable ? '✓ 正常' : '⚠ 檢查中') : '—'}</b></span>
            </div>
            <div className="flex gap-2.5 mt-4">
              <button disabled={['running', 'starting'].includes(s.status)} onClick={() => act(s.id, 'start')}
                className="flex-1 rounded-xl py-2.5 font-bold text-sm bg-leaf-500 text-white disabled:opacity-40 hover:bg-leaf-600 transition">啟動</button>
              <button disabled={['stopped', 'stopping'].includes(s.status)} onClick={() => act(s.id, 'stop')}
                className="flex-1 rounded-xl py-2.5 font-bold text-sm bg-rose-50 text-rose-500 border border-rose-100 disabled:opacity-40 transition">停止</button>
              <a href={s.url} target="_blank" rel="noopener"
                className={`flex-1 rounded-xl py-2.5 font-bold text-sm text-center border border-leaf-200 text-leaf-700 ${s.status === 'running' && s.reachable ? '' : 'pointer-events-none opacity-40'}`}>開啟 ↗</a>
            </div>
          </div>
        ))}
      </main>
      <footer className="text-center text-xs text-slate-400 py-6">單一 Node 主程序真實 spawn / kill 子服務 · 手刻 WebSocket 廣播即時健康狀態</footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={qc}><Dashboard /></QueryClientProvider>
);
