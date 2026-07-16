// scripts/dev.mjs — dev 一鍵啟動：同時執行 Vite(HMR, 5173) 與控制台 orchestrator(API/WS, 4000)
// 用法：npm run dev:all  （或 node scripts/dev.mjs）
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const procs = [];

function run(args, name, color) {
  const p = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
  const tag = `\x1b[${color}m[${name}]\x1b[0m `;
  p.stdout.on('data', (d) => process.stdout.write(tag + d));
  p.stderr.on('data', (d) => process.stderr.write(tag + d));
  p.on('exit', (c) => { console.log(tag + `退出 (code ${c})`); shutdown(); });
  procs.push(p);
}

function shutdown() { for (const p of procs) { try { p.kill('SIGTERM'); } catch {} } process.exit(0); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('\n  dev 一鍵啟動：');
console.log('   · 控制台(HMR)  http://localhost:5173   （編輯 src 即時熱更新）');
console.log('   · API / 服務   http://localhost:4000   （REST 啟停 + WebSocket 狀態）');
console.log('   · 在控制台按「啟動」拉起各服務後，用「開啟 ↗」進入（各自埠號）\n');

run(['node_modules/vite/bin/vite.js'], 'vite', '36'); // 前端 HMR
run(['server/server.js'], 'api', '32');               // orchestrator
