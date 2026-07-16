import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useGarden } from '../lib/store';
import '../index.css';

type FlowerMesh = { group: THREE.Group; phase: number; baseRot: number };

function Scene() {
  const lowDevice = useGarden((s) => s.lowDevice);
  const toggleLow = useGarden((s) => s.toggleLowDevice);
  const mountRef = useRef<HTMLDivElement>(null);
  const [fps, setFps] = useState(60);
  const [count, setCount] = useState(0);
  const apiRef = useRef<{ addFlower: () => void } | null>(null);
  const lowRef = useRef(lowDevice);
  lowRef.current = lowDevice;

  useEffect(() => {
    const mount = mountRef.current!;
    const W = mount.clientWidth, H = 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#eaf7ef');
    scene.fog = new THREE.Fog('#eaf7ef', 14, 30);

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 6, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: !lowRef.current });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowRef.current ? 1 : 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = !lowRef.current;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 5; controls.maxDistance = 22;
    controls.autoRotate = true; controls.autoRotateSpeed = 0.6;

    // 燈光
    scene.add(new THREE.HemisphereLight('#ffffff', '#9ccc7a', 0.9));
    const sun = new THREE.DirectionalLight('#fff6e0', 1.1);
    sun.position.set(6, 12, 6); sun.castShadow = !lowRef.current;
    scene.add(sun);

    // 草地
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(16, lowRef.current ? 24 : 64),
      new THREE.MeshStandardMaterial({ color: '#7ec850' })
    );
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    scene.add(ground);

    const flowers: FlowerMesh[] = [];
    const seg = lowRef.current ? 6 : 12;

    function makeFlower(): THREE.Group {
      const g = new THREE.Group();
      const hue = Math.random();
      const petalColor = new THREE.Color().setHSL(hue, 0.7, 0.6);
      // 花莖
      const stemH = 1.4 + Math.random() * 0.8;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, stemH, seg),
        new THREE.MeshStandardMaterial({ color: '#4d8a33' })
      );
      stem.position.y = stemH / 2; stem.castShadow = !lowRef.current;
      g.add(stem);
      // 花瓣
      const head = new THREE.Group(); head.position.y = stemH;
      const petalGeo = new THREE.SphereGeometry(0.22, seg, seg);
      const n = lowRef.current ? 5 : 8;
      for (let i = 0; i < n; i++) {
        const p = new THREE.Mesh(petalGeo, new THREE.MeshStandardMaterial({ color: petalColor }));
        const a = (i / n) * Math.PI * 2;
        p.position.set(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32);
        p.scale.set(1, 0.5, 1.4); p.castShadow = !lowRef.current;
        head.add(p);
      }
      const center = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, seg, seg),
        new THREE.MeshStandardMaterial({ color: '#f5b301' })
      );
      head.add(center);
      g.add(head);
      return g;
    }
    function addFlower() {
      const g = makeFlower();
      const r = Math.random() * 12;
      const t = Math.random() * Math.PI * 2;
      g.position.set(Math.cos(t) * r, 0, Math.sin(t) * r);
      const baseRot = Math.random() * Math.PI;
      g.rotation.y = baseRot;
      scene.add(g);
      flowers.push({ group: g, phase: Math.random() * Math.PI * 2, baseRot });
      setCount(flowers.length);
    }
    apiRef.current = { addFlower };
    for (let i = 0; i < 14; i++) addFlower(); // 初始花田

    let raf = 0, frames = 0, fpsT = performance.now(), last = performance.now();
    function loop(now: number) {
      const dt = (now - last) / 1000; last = now;
      for (const f of flowers) { f.phase += dt; f.group.rotation.z = Math.sin(f.phase) * 0.08; } // 風吹搖曳
      controls.update();
      renderer.render(scene, camera);
      frames++;
      if (now - fpsT >= 500) { setFps(Math.round((frames * 1000) / (now - fpsT))); frames = 0; fpsT = now; }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    const onResize = () => { const w = mount.clientWidth; camera.aspect = w / H; camera.updateProjectionMatrix(); renderer.setSize(w, H); };
    window.addEventListener('resize', onResize);

    // cleanup：釋放 GPU 資源、移除 listener、停止迴圈（避免 WebGL 記憶體洩漏）
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
      });
      mount.removeChild(renderer.domElement);
    };
  }, [lowDevice]); // 切換低配模式會重建場景（示範不同渲染設定）

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-leaf-50 text-soil-900">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">3D 花園場景</h1>
            <p className="text-sm text-slate-500 mt-1">Three.js · WebGL 3D 渲染 · OrbitControls 互動相機 · 風吹搖曳 · 資源釋放 cleanup</p>
          </div>
          <div className="text-sm bg-white/80 border border-leaf-100 rounded-lg px-3 py-1.5 shadow-sm">
            FPS <b className={`tabular-nums ${fps < 40 ? 'text-rose-500' : 'text-leaf-600'}`}>{fps}</b> · 花 <b className="tabular-nums">{count}</b>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-white border border-leaf-100 p-3 shadow-sm overflow-hidden">
          <div ref={mountRef} className="w-full rounded-xl overflow-hidden" style={{ height: 420 }} />
          <div className="flex items-center justify-center gap-4 mt-3">
            <button onClick={() => apiRef.current?.addFlower()} className="rounded-full bg-leaf-500 hover:bg-leaf-600 text-white font-bold px-8 py-3 shadow-md transition active:translate-y-0.5">🌷 種一朵</button>
            <label className="text-[13px] text-slate-500 flex items-center gap-2">
              <input type="checkbox" checked={lowDevice} onChange={toggleLow} /> 低配裝置模式（低多邊形、關陰影、限 pixelRatio）
            </label>
          </div>
        </div>
        <p className="text-[11.5px] text-slate-400 mt-3 text-center">拖曳可旋轉視角、滾輪縮放；離開頁面時會釋放所有 geometry / material / renderer，避免 WebGL 記憶體洩漏。</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Scene />);
