import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, CardContent } from '@is_tess/components';
import { useGarden } from '../lib/store';
import { usePrefersReducedMotion } from '../lib/motion';
import { StationShell, boot } from '../lib/shell';
import '../index.css';

type Flower = { x: number; y: number; grow: number; hue: number; petals: number; sway: number };
type Petal = { x: number; y: number; vx: number; vy: number; life: number; hue: number };

function Bloom() {
  const lowDevice = useGarden((s) => s.lowDevice);
  const toggleLow = useGarden((s) => s.toggleLowDevice);
  const reduced = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fps, setFps] = useState(60);
  const [count, setCount] = useState(0);
  const flowers = useRef<Flower[]>([]);
  const particles = useRef<Petal[]>([]);
  const lowRef = useRef(lowDevice);
  const reducedRef = useRef(reduced);
  lowRef.current = lowDevice;
  reducedRef.current = reduced;

  function seed() {
    const c = canvasRef.current!;
    flowers.current.push({
      x: 40 + Math.random() * Math.max(1, c.width - 80),
      y: c.height - 10,
      grow: reducedRef.current ? 1 : 0,
      hue: Math.floor(Math.random() * 360),
      petals: lowRef.current ? 6 : 10,
      sway: Math.random() * Math.PI * 2,
    });
    if (flowers.current.length > 24) flowers.current.shift();
    setCount(flowers.current.length);
  }

  useEffect(() => {
    const c = canvasRef.current!;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const g = ctx;

    function fit() {
      const parent = c.parentElement;
      const w = parent?.clientWidth ?? 640;
      c.width = Math.max(280, Math.floor(w));
      c.height = Math.max(180, Math.min(320, Math.round(c.width * 0.45)));
    }
    fit();

    const STEP = 1000 / 60;
    let acc = 0,
      last = performance.now(),
      frames = 0,
      fpsT = last,
      raf = 0;

    function update(dt: number) {
      const k = dt / STEP;
      const reducedMotion = reducedRef.current;
      for (const f of flowers.current) {
        if (f.grow < 1) f.grow = reducedMotion ? 1 : Math.min(1, f.grow + 0.012 * k);
        if (!reducedMotion) f.sway += 0.02 * k;
        if (f.grow >= 1 && !lowRef.current && !reducedMotion && Math.random() < 0.03) {
          const stemTop = f.y - 120 * f.grow;
          particles.current.push({
            x: f.x,
            y: stemTop,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -Math.random() * 1.5,
            life: 1,
            hue: f.hue,
          });
        }
      }
      if (!reducedMotion) {
        for (const p of particles.current) {
          p.x += p.vx * k;
          p.y += p.vy * k;
          p.vy += 0.03 * k;
          p.life -= 0.01 * k;
        }
        particles.current = particles.current.filter((p) => p.life > 0);
      } else {
        particles.current = [];
      }
    }

    function draw() {
      g.clearRect(0, 0, c.width, c.height);
      g.fillStyle = '#e2f0e6';
      g.fillRect(0, c.height - 12, c.width, 12);
      for (const f of flowers.current) {
        const h = 120 * f.grow;
        const topX = f.x + Math.sin(f.sway) * 6 * f.grow;
        const topY = f.y - h;
        g.strokeStyle = '#4d8a33';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(f.x, f.y);
        g.quadraticCurveTo(f.x, f.y - h / 2, topX, topY);
        g.stroke();
        if (f.grow > 0.4) {
          const open = Math.min(1, (f.grow - 0.4) / 0.6);
          for (let i = 0; i < f.petals; i++) {
            const a = (i / f.petals) * Math.PI * 2 + f.sway * 0.3;
            const r = 16 * open;
            g.fillStyle = `hsl(${f.hue} 80% ${70 - i}%)`;
            g.beginPath();
            g.ellipse(topX + Math.cos(a) * r, topY + Math.sin(a) * r, 9 * open, 5 * open, a, 0, Math.PI * 2);
            g.fill();
          }
          g.fillStyle = '#f59e0b';
          g.beginPath();
          g.arc(topX, topY, 6 * open, 0, Math.PI * 2);
          g.fill();
        }
      }
      for (const p of particles.current) {
        g.fillStyle = `hsla(${p.hue} 80% 70% / ${p.life})`;
        g.fillRect(p.x, p.y, 3, 3);
      }
    }

    function frame(now: number) {
      const target = lowRef.current || reducedRef.current ? 1000 / 30 : STEP;
      acc += now - last;
      last = now;
      let guard = 0;
      while (acc >= target && guard++ < 5) {
        update(target);
        acc -= target;
      }
      draw();
      frames++;
      if (now - fpsT >= 500) {
        setFps(Math.round((frames * 1000) / (now - fpsT)));
        setCount(flowers.current.length);
        frames = 0;
        fpsT = now;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <StationShell
      title="花朵綻放"
      description="Canvas · 固定時間步長 · 弱裝置降階 · 本機 lab 示範"
      actions={
        <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
          FPS{' '}
          <b className={`tabular-nums ${fps < 40 ? 'text-destructive' : 'text-foreground'}`}>{fps}</b>
          {' · '}花 <b className="tabular-nums">{count}</b>
        </span>
      }
    >
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full rounded-xl border border-border"
              style={{ background: 'linear-gradient(var(--surface-canvas, #f3faf4), var(--surface-muted, #e2f0e6))' }}
              role="img"
              aria-label="花朵綻放畫布。按播種新增一株。"
            />
            {count === 0 ? (
              <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                畫布是空的。按「播種」長出第一朵。
              </p>
            ) : null}
          </div>
          <div className="mt-4 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button type="button" onClick={seed}>
              播種
            </Button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={lowDevice} onChange={toggleLow} />
              低配裝置模式（30fps、關粒子、減花瓣）
            </label>
          </div>
        </CardContent>
      </Card>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        固定時間步長讓不同刷新率裝置生長速度一致；若系統偏好減少動態，花會直接開在終態、不播花粉。
      </p>
    </StationShell>
  );
}

boot(<Bloom />);
