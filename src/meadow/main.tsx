import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, VirtualList } from '@is_tess/components';
import { StationShell, boot } from '../lib/shell';
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
    <div className="flex h-full items-center justify-between border-b border-border px-3 text-sm">
      <span>
        {r.species} {r.label}
      </span>
      <span
        className="h-1.5 rounded bg-primary"
        style={{ width: r.val }}
        aria-hidden
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
    <StationShell
      title="花圃效能實驗室"
      description="全量 DOM vs VirtualList · 洩漏示範 · 會卡住分頁是預期行為"
      actions={
        <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
          FPS <b className={`tabular-nums ${fps < 40 ? 'text-destructive' : 'text-foreground'}`}>{fps}</b>
        </span>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'naive' ? 'default' : 'outline'}
          aria-pressed={mode === 'naive'}
          onClick={() => setMode('naive')}
        >
          全量渲染（卡頓）
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'virtual' ? 'default' : 'outline'}
          aria-pressed={mode === 'virtual'}
          onClick={() => setMode('virtual')}
        >
          VirtualList（流暢）
        </Button>
        <span className="ml-1 text-xs text-muted-foreground">資料量</span>
        {[5000, 20000, 50000].map((n) => (
          <Button
            key={n}
            type="button"
            size="sm"
            variant={count === n ? 'secondary' : 'outline'}
            aria-pressed={count === n}
            onClick={() => setCount(n)}
          >
            {n / 1000}k
          </Button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">列表渲染</CardTitle>
            <p className="text-xs text-muted-foreground">
              {mode === 'virtual'
                ? 'VirtualList：只掛可視窗列。'
                : `全量渲染：一次塞入 ${data.length.toLocaleString()} 節點，可能讓分頁無回應。`}
            </p>
          </CardHeader>
          <CardContent>
            {mode === 'virtual' ? (
              <VirtualList
                items={data}
                height={H}
                estimateSize={ROW_H}
                className="rounded-xl border border-border bg-muted/40"
                getItemKey={(r) => r.id}
                renderItem={(r) => <RowView r={r} />}
              />
            ) : (
              <div className="relative h-[380px] overflow-auto rounded-xl border border-border bg-muted/40">
                {data.map((r) => (
                  <div key={r.id} style={{ height: ROW_H }}>
                    <RowView r={r} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">記憶體洩漏示範</CardTitle>
            <p className="text-xs text-muted-foreground">
              每秒 push 大陣列並掛上不移除的 listener。開 DevTools › Memory 觀察 Heap。只在本機分頁生效。
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={startLeak}>
                開始洩漏
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={stopLeak}>
                停止並清除
              </Button>
            </div>
            <div className="mt-3 border-t border-dashed border-border pt-3 text-sm text-muted-foreground" aria-live="polite">
              已洩漏區塊 <b className="tabular-nums text-foreground">{leakN}</b> · 估計{' '}
              <b className="tabular-nums text-foreground">{(leakN * 1.6).toFixed(1)}</b> MB
              <br />
              <span className={leakOn ? 'text-destructive' : 'text-foreground'}>
                {leakOn ? '洩漏中…' : '閒置 / 已清除'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </StationShell>
  );
}

boot(<Meadow />);
