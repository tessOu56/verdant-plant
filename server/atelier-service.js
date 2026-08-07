// server/atelier-service.js — 鍊金工坊：catalog / inventory / craft REST + 靜態頁
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { serveStatic } from './static.js';
import { applyComplete, applyStart } from '../shared/atelier/craft-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const DATA = path.join(ROOT, 'shared', 'atelier');
const PORT = Number(process.env.PORT) || 4105;

const substances = JSON.parse(fs.readFileSync(path.join(DATA, 'substances.json'), 'utf8'));
const recipes = JSON.parse(fs.readFileSync(path.join(DATA, 'recipes.json'), 'utf8'));
const seedStock = JSON.parse(fs.readFileSync(path.join(DATA, 'inventory.seed.json'), 'utf8'));

let stock = { ...seedStock };
/** @type {{ recipeId: string, startedAt: number, readyAt: number, pendingOutputs: { substanceId: string, qty: number }[] } | null} */
let job = null;

const json = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function findRecipe(id) {
  return recipes.find((r) => r.id === id);
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  try {
    if (url === '/api/atelier/catalog' && req.method === 'GET') {
      return json(res, 200, { substances, recipes });
    }
    if (url === '/api/atelier/inventory' && req.method === 'GET') {
      return json(res, 200, { stock });
    }
    if (url === '/api/atelier/craft' && req.method === 'GET') {
      return json(res, 200, { job });
    }
    if (url === '/api/atelier/craft' && req.method === 'POST') {
      const body = await readBody(req);
      const recipe = findRecipe(body.recipeId);
      if (!recipe) return json(res, 400, { error: 'unknown_recipe' });
      const result = applyStart(stock, recipe, Date.now(), job);
      if (!result.ok) return json(res, 400, { error: result.error, stock: result.stock, job: result.job });
      stock = result.stock;
      job = result.job;
      return json(res, 200, { stock, job });
    }
    if (url === '/api/atelier/craft/complete' && req.method === 'POST') {
      if (!job) return json(res, 400, { error: 'no_craft' });
      const result = applyComplete(stock, job, Date.now());
      if (!result.ok) return json(res, 400, { error: result.error, stock: result.stock, job: result.job });
      stock = result.stock;
      job = null;
      return json(res, 200, { stock, job: null });
    }
    if (url === '/api/atelier/inventory/reset' && req.method === 'POST') {
      stock = { ...seedStock };
      job = null;
      return json(res, 200, { stock, job: null });
    }
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
  if (serveStatic(DIST, req, res, 'atelier.html')) return;
  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => console.log('READY atelier on ' + PORT));
