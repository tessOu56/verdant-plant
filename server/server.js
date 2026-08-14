// server/server.js — Verdant Platform orchestrator（服務管理 + 即時狀態）
import http from 'http';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { WsServer } from './miniws.js';
import { serveStatic } from './static.js';
import registry from './services.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 4000;
/** Single-port public host (Render): open links use same-origin /{id}.html */
const HOSTED = process.env.HOSTED === '1' || process.env.HOSTED === 'true';
const PUBLIC_BASE = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');

const state = {};
const procs = {};
for (const s of registry) {
  state[s.id] = { status: 'stopped', pid: null, startedAt: null, restarts: 0, reachable: false };
}
const svc = (id) => registry.find((s) => s.id === id);

function serviceUrl(s) {
  if (HOSTED || PUBLIC_BASE) {
    const base = PUBLIC_BASE || '';
    return `${base}/${s.id}.html`;
  }
  return `http://localhost:${s.port}`;
}

function snapshot() {
  return {
    type: 'snapshot',
    ts: Date.now(),
    hosted: HOSTED,
    services: registry.map((s) => ({
      id: s.id,
      name: s.name,
      port: s.port,
      accent: s.accent,
      tags: s.tags,
      role: s.role,
      desc: s.desc,
      ...state[s.id],
      uptime: state[s.id].startedAt ? Date.now() - state[s.id].startedAt : 0,
      url: serviceUrl(s),
    })),
  };
}
function broadcast() {
  ws.broadcast(JSON.stringify(snapshot()));
}

function startService(id) {
  const s = svc(id);
  if (!s) return { error: 'unknown' };
  if (['running', 'starting'].includes(state[id].status)) return state[id];
  state[id].status = 'starting';
  broadcast();
  const child = spawn(process.execPath, [path.join(ROOT, s.script)], {
    env: { ...process.env, PORT: String(s.port) },
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  procs[id] = child;
  state[id].pid = child.pid;
  state[id].startedAt = Date.now();
  child.stdout.on('data', (d) => {
    if (String(d).includes('READY')) {
      state[id].status = 'running';
      broadcast();
    }
  });
  child.stderr.on('data', (d) => process.stderr.write(`[${id}] ${d}`));
  child.on('exit', () => {
    state[id].status = 'stopped';
    state[id].pid = null;
    state[id].reachable = false;
    state[id].startedAt = null;
    delete procs[id];
    broadcast();
  });
  return state[id];
}
function stopService(id) {
  const child = procs[id];
  if (!child) {
    state[id].status = 'stopped';
    broadcast();
    return state[id];
  }
  state[id].status = 'stopping';
  broadcast();
  child.kill('SIGTERM');
  setTimeout(() => {
    if (procs[id]) procs[id].kill('SIGKILL');
  }, 3000);
  return state[id];
}
function checkReachable(port, cb) {
  const s = net.connect({ host: '127.0.0.1', port }, () => {
    s.destroy();
    cb(true);
  });
  s.setTimeout(800);
  s.on('timeout', () => {
    s.destroy();
    cb(false);
  });
  s.on('error', () => cb(false));
}
setInterval(() => {
  let pending = registry.length;
  if (!pending) return;
  for (const s of registry) {
    if (state[s.id].status === 'running') {
      checkReachable(s.port, (ok) => {
        state[s.id].reachable = ok;
        if (--pending === 0) broadcast();
      });
    } else {
      state[s.id].reachable = false;
      if (--pending === 0) broadcast();
    }
  }
}, 2000);

const json = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
};

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/health' || url === '/api/health') {
    return json(res, 200, { status: 'ok', service: 'verdant-platform', hosted: HOSTED });
  }
  if (url === '/api/services') return json(res, 200, snapshot());
  const m = url.match(/^\/api\/services\/([\w-]+)\/(start|stop)$/);
  if (m && req.method === 'POST') {
    const [, id, action] = m;
    if (!svc(id)) return json(res, 404, { error: 'not found' });
    return json(res, 200, action === 'start' ? startService(id) : stopService(id));
  }
  if (serveStatic(DIST, req, res, 'index.html')) return;
  res.writeHead(404);
  res.end('Not found（請先 npm run build 產生 dist）');
});

const ws = new WsServer(server, '/ws');
ws.on('connection', (conn) => {
  conn.send(JSON.stringify(snapshot()));
  const hb = setInterval(() => conn.ping(), 15000);
  conn.on('close', () => clearInterval(hb));
});

function shutdown() {
  for (const id in procs) {
    try {
      procs[id].kill('SIGKILL');
    } catch {}
  }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
server.listen(PORT, () => {
  console.log(`\n  Verdant Platform：http://localhost:${PORT}  hosted=${HOSTED}\n`);
});
