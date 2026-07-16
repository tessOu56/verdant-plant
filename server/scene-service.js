import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { serveStatic } from './static.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT) || 4104;
http.createServer((req, res) => { if (serveStatic(DIST, req, res, 'scene.html')) return; res.writeHead(404); res.end('Not found'); })
  .listen(PORT, () => console.log('READY scene on ' + PORT));
