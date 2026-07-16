import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useGarden } from '../lib/store';
import '../index.css';

type Flower = { x: number; y: number; grow: number; hue: number; petals: number; sway: number };
type Petal = { x: number; y: number; vx: number; vy: number; life: number; hue: number };

function Bloom() {
  const lowDevice = useGarden((s) => s.lowDevice);
  const toggleLow = useGarden((s) => s.toggleLowDevice);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fps, setFps] = useState(60);
  const flowers = useRef<Flower[]>([]);
  const particles = useRef<Petal[]>([]);
  const lowRef = useRef(lowDevice);
  lowRef.current = lowDevice;

  function seed() {
    const c = canvasRef.current!;
    flowers.current.push({
      x: 40 + Math.random() * (c.width - 80),
      y: c.height - 10,
      grow: 0,
      hue: Math.floor(Math.random() * 360),
      petals: lowRef.current ? 6 : 10,
      sway: Math.random() * Math.PI * 2,
    });
    if (flowers.current.length > 24) flowers.current.shift();
  }

  useEffect(() => {
    const c = canvasRef.current!;
    const ctx = c.getContext('2d')!;
    const STEP = 1000 / 60;
    let acc = 0, last = performance.now(), frames = 0, fpsT = last, raf = 0;

    function update(dt: number) {
      const k = dt / STEP;
      for (const f of flowers.current) {
        if (f.grow < 1) f.grow = Math.min(1, f.grow + 0.012 * k); // 緩動生長
        f.sway += 0.02 * k;
        if (f.grow >= 1 && !lowRef.current && Math.random() < 0.03) {
          const stemTop = f.y - 120 * f.grow;
          particles.current.push({ x: f.x, y: stemTop, vx: (Math.random() - .5) * 1.5, vy: -Math.random() * 1.5, life: 1, hue: f.hue });
        }
      }
      for (const p of particles.current) { p.x += p.vx * k; p.y += p.vy * k; p.vy += 0.03 * k; p.life -= 0.01 * k; }
      particles.current = particles.current.filter((p) => p.life > 0);
    }

    function draw() {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#e0f0d6'; ctx.fillRect(0, c.height - 12, c.width, 12); // 土壤
      for (const f of flowers.current) {
        const h = 120 * f.grow;
        const topX = f.x + Math.sin(f.sway) * 6 * f.grow;
        const topY = f.y - h;
        ctx.strokeStyle = '#4d8a33'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x, f.y - h / 2, topX, topY); ctx.stroke();
        if (f.grow > 0.4) {
          const open = Math.min(1, (f.grow - 0.4) / 0.6); // 花瓣綻放
          for (let i = 0; i < f.petals; i++) {
            const a = (i / f.petals) * Math.PI * 2 + f.sway * 0.3;
            const r = 16 * open;
            ctx.fillStyle = `hsl(${f.hue} 80% ${70 - i}%)`;
            ctx.beginPath();
            ctx.ellipse(topX + Math.cos(a) * r, topY + Math.sin(a) * r, 9 * open, 5 * open, a, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(topX, topY, 6 * open, 0, Math.PI * 2); ctx.fill();
        }
      }
      for (const p of particles.current) { ctx.fillStyle = `hsla(${p.hue} 80% 70% / ${p.life})`; ctx.fillRect(p.x, p.y, 3, 3); }
    }

    function frame(now: number) {
      const target = lowRef.current ? 1000 / 30 : STEP;
      acc += now - last; last = now;
      let guard = 0;
      while (acc >= target && guard++ < 5) { update(target); acc -= target; }
      draw();
      frames++;
      if (now - fpsT >= 500) { setFps(Math.round((frames * 1000) / (now - fpsT))); frames = 0; fpsT = now; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf); // cleanup：避免動畫迴圈洩漏
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-leaf-50 text-soil-900">
      <div className="max-w-3xl mx-auto p-6 text-center">
        <h1 className="text-xl font-bold">花朵綻放</h1>
        <p className="text-sm text-slate-500 mt-1">Canvas · requestAnimationFrame 固定時間步長 · 緩動生長與花瓣綻放 · 花粉粒子 · 弱裝置降階</p>
        <div className="fixed top-3 right-4 text-sm bg-white/80 border border-leaf-100 rounded-lg px-3 py-1.5 shadow-sm">
          FPS <b className={`tabular-nums ${fps < 40 ? 'text-rose-500' : 'text-leaf-600'}`}>{fps}</b> · 花 <b className="tabular-nums">{flowers.current.length}</b>
        </div>
        <div className="mt-5 rounded-2xl bg-white border border-leaf-100 p-4 shadow-sm">
          <canvas ref={canvasRef} width={640} height={300} className="w-full rounded-xl" style={{ background: 'linear-gradient(#f7fbff,#eefaf0)' }} />
          <div className="flex items-center justify-center gap-4 mt-4">
            <button onClick={seed} className="rounded-full bg-leaf-500 hover:bg-leaf-600 text-white font-bold px-8 py-3 shadow-md transition active:translate-y-0.5">🌱 播種</button>
            <label className="text-[13px] text-slate-500 flex items-center gap-2">
              <input type="checkbox" checked={lowDevice} onChange={toggleLow} /> 低配裝置模式（30fps、關粒子、減花瓣）
            </label>
          </div>
        </div>
        <p className="text-[11.5px] text-slate-400 mt-3">固定時間步長讓不同刷新率裝置生長速度一致；低配模式示範降階策略。</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Bloom />);
