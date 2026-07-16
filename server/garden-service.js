// server/garden-service.js — 共享花園即時服務（靜態頁 + REST 排行 + WebSocket 遊戲迴圈）
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WsServer } from './miniws.js';
import { serveStatic } from './static.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT) || 4101;

const SPECIES = ['tulip', 'sunflower', 'cherry', 'rose'];
const plants = Array.from({ length: 24 }, (_, i) => ({ id: i, stage: Math.floor(Math.random() * 2), species: SPECIES[i % 4], blooming: false }));
let round = 0;
const leaderboard = [
  { name: 'Aki 的陽台', area: '台北', blooms: 128 }, { name: 'Mei 的溫室', area: '台中', blooms: 96 },
  { name: 'Lin 的花田', area: '台南', blooms: 74 }, { name: 'Yu 的窗台', area: '高雄', blooms: 51 },
];

const server = http.createServer((req, res) => {
  if (req.url.split('?')[0] === '/api/leaderboard') {
    leaderboard.forEach((r) => { if (Math.random() < 0.5) r.blooms += Math.floor(Math.random() * 3); });
    leaderboard.sort((a, b) => b.blooms - a.blooms);
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(leaderboard)); return;
  }
  if (serveStatic(DIST, req, res, 'garden.html')) return;
  res.writeHead(404); res.end('Not found');
});

const ws = new WsServer(server, '/ws');

// 生長迴圈：每秒隨機幾株長一階
setInterval(() => {
  for (let k = 0; k < 3; k++) {
    const p = plants[Math.floor(Math.random() * plants.length)];
    if (!p.blooming && p.stage < 2) { p.stage++; ws.broadcast(JSON.stringify({ type: 'grow', plant: p })); }
  }
}, 1000);
// 開花事件：每 6 秒一株綻放，之後重置
let tick = 0;
setInterval(() => {
  if (++tick % 6 !== 0) return;
  round++;
  const p = plants[Math.floor(Math.random() * plants.length)];
  p.blooming = true; p.stage = 2;
  ws.broadcast(JSON.stringify({ type: 'bloom', round, plant: p }));
  setTimeout(() => { p.blooming = false; p.stage = 0; ws.broadcast(JSON.stringify({ type: 'grow', plant: p })); }, 4000);
}, 1000);

ws.on('connection', (conn) => {
  conn.send(JSON.stringify({ type: 'hello', round, plants }));
  const hb = setInterval(() => conn.ping(), 15000);
  conn.on('message', (raw) => {
    try { const m = JSON.parse(raw);
      if (m.type === 'water') { const p = plants[m.id]; if (p && p.stage < 2) p.stage++;
        conn.send(JSON.stringify({ type: 'water-ack', plant: p })); ws.broadcast(JSON.stringify({ type: 'grow', plant: p })); }
    } catch {}
  });
  conn.on('close', () => clearInterval(hb));
});

server.listen(PORT, () => console.log('READY garden on ' + PORT));
