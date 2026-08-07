#!/usr/bin/env node
/** Copy Vite dist → dist-app with atelier.html as index.html for Capacitor. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'dist');
const DEST = path.join(ROOT, 'dist-app');

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    const a = path.join(from, name);
    const b = path.join(to, name);
    if (fs.statSync(a).isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

if (!fs.existsSync(path.join(SRC, 'atelier.html'))) {
  console.error('Missing dist/atelier.html — run vite build first');
  process.exit(1);
}

rmrf(DEST);
copyDir(SRC, DEST);
fs.copyFileSync(path.join(DEST, 'atelier.html'), path.join(DEST, 'index.html'));
console.log('dist-app ready (index.html ← atelier.html)');
