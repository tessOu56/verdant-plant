import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Button, EmptyState, Viewport3D } from '@is_tess/components';
import { useGarden } from '../lib/store';
import { usePrefersReducedMotion } from '../lib/motion';
import { StationShell, boot } from '../lib/shell';
import '../index.css';

type FlowerMesh = { group: THREE.Group; phase: number; baseRot: number };

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('webgl2'));
  } catch {
    return false;
  }
}

function Scene() {
  const lowDevice = useGarden((s) => s.lowDevice);
  const toggleLow = useGarden((s) => s.toggleLowDevice);
  const reduced = usePrefersReducedMotion();
  const mountRef = useRef<HTMLDivElement>(null);
  const [fps, setFps] = useState(60);
  const [count, setCount] = useState(0);
  const [unsupported, setUnsupported] = useState(false);
  const apiRef = useRef<{ addFlower: () => void } | null>(null);
  const lowRef = useRef(lowDevice);
  lowRef.current = lowDevice;

  useEffect(() => {
    if (!webglOk()) {
      setUnsupported(true);
      return;
    }
    const mount = mountRef.current;
    if (!mount) return;
    const W = mount.clientWidth || 640;
    const H = Math.max(mount.clientHeight || 0, 240);

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
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !reduced;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 5;
    controls.maxDistance = 22;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 0.6;

    scene.add(new THREE.HemisphereLight('#ffffff', '#9ccc7a', 0.9));
    const sun = new THREE.DirectionalLight('#fff6e0', 1.1);
    sun.position.set(6, 12, 6);
    sun.castShadow = !lowRef.current;
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(16, lowRef.current ? 24 : 64),
      new THREE.MeshStandardMaterial({ color: '#7ec850' }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const flowers: FlowerMesh[] = [];
    const seg = lowRef.current ? 6 : 12;

    function makeFlower(): THREE.Group {
      const g = new THREE.Group();
      const hue = Math.random();
      const petalColor = new THREE.Color().setHSL(hue, 0.7, 0.6);
      const stemH = 1.4 + Math.random() * 0.8;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, stemH, seg),
        new THREE.MeshStandardMaterial({ color: '#4d8a33' }),
      );
      stem.position.y = stemH / 2;
      stem.castShadow = !lowRef.current;
      g.add(stem);
      const head = new THREE.Group();
      head.position.y = stemH;
      const petalGeo = new THREE.SphereGeometry(0.22, seg, seg);
      const n = lowRef.current ? 5 : 8;
      for (let i = 0; i < n; i++) {
        const p = new THREE.Mesh(petalGeo, new THREE.MeshStandardMaterial({ color: petalColor }));
        const a = (i / n) * Math.PI * 2;
        p.position.set(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32);
        p.scale.set(1, 0.5, 1.4);
        p.castShadow = !lowRef.current;
        head.add(p);
      }
      const center = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, seg, seg),
        new THREE.MeshStandardMaterial({ color: '#f5b301' }),
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
    for (let i = 0; i < 14; i++) addFlower();

    let raf = 0,
      frames = 0,
      fpsT = performance.now(),
      last = performance.now();
    function loop(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      if (!reduced) {
        for (const f of flowers) {
          f.phase += dt;
          f.group.rotation.z = Math.sin(f.phase) * 0.08;
        }
      }
      controls.update();
      renderer.render(scene, camera);
      frames++;
      if (now - fpsT >= 500) {
        setFps(Math.round((frames * 1000) / (now - fpsT)));
        frames = 0;
        fpsT = now;
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    const onResize = () => {
      const w = mount.clientWidth;
      const h = Math.max(mount.clientHeight, 240);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

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
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [lowDevice, reduced]);

  return (
    <StationShell
      title="3D 花園場景"
      description="Three.js · OrbitControls · 離開頁面釋放 GPU · 本機 lab"
      actions={
        <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
          FPS <b className={`tabular-nums ${fps < 40 ? 'text-destructive' : 'text-foreground'}`}>{fps}</b>
          {' · '}花 <b className="tabular-nums">{count}</b>
        </span>
      }
    >
      {unsupported ? (
        <EmptyState
          title="這個瀏覽器沒有 WebGL"
          description="3D 站需要 WebGL。可改開花園、綻放、花圃或 Atelier。"
        />
      ) : (
        <>
          <Viewport3D
            label="Three.js viewport · dispose on unmount"
            aspectRatio="16 / 10"
            role="application"
            aria-label="3D 花園。拖曳旋轉，滾輪縮放。"
          >
            <div ref={mountRef} className="h-full min-h-[240px] w-full" />
          </Viewport3D>
          <div className="mt-3 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button type="button" onClick={() => apiRef.current?.addFlower()}>
              種一朵
            </Button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={lowDevice} onChange={toggleLow} />
              低配裝置模式（低多邊形、關陰影、限 pixelRatio）
            </label>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            拖曳旋轉、滾輪縮放。系統偏好減少動態時會關掉自動旋轉與風吹。離開頁面會釋放 geometry / material / renderer。
          </p>
        </>
      )}
    </StationShell>
  );
}

boot(<Scene />);
