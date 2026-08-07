import { applyComplete, applyStart } from '../../shared/atelier/engine';
import substances from '../../shared/atelier/substances.json';
import recipes from '../../shared/atelier/recipes.json';
import seedStock from '../../shared/atelier/inventory.seed.json';
import type { AtelierMode, CraftJob, Recipe, Stock, Substance } from './types';

const STORAGE_KEY = 'verdant.atelier.v1';
/** Local / Capacitor demo: clamp craft duration for snappy play. */
export const DEMO_MAX_DURATION_SEC = 3;

type Persisted = { stock: Stock; job: CraftJob | null };

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { stock: { ...seedStock }, job: null };
    const parsed = JSON.parse(raw) as Persisted;
    return {
      stock: parsed.stock ?? { ...seedStock },
      job: parsed.job ?? null,
    };
  } catch {
    return { stock: { ...seedStock }, job: null };
  }
}

function savePersisted(state: Persisted) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let mem = loadPersisted();

export function resolveMode(): AtelierMode {
  const q = new URLSearchParams(window.location.search);
  if (q.get('api') === '1') return 'remote';
  if (q.get('local') === '1') return 'local';
  return 'local';
}

export function effectiveDurationSec(recipe: Recipe, mode: AtelierMode): number {
  if (mode === 'local') return Math.min(recipe.durationSec, DEMO_MAX_DURATION_SEC);
  return recipe.durationSec;
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fetchCatalog(_mode: AtelierMode): Promise<{ substances: Substance[]; recipes: Recipe[] }> {
  // Catalog is always bundled so static / Capacitor works offline.
  // Remote mode still uses the same seed (server seed is identical).
  return {
    substances: substances as Substance[],
    recipes: recipes as Recipe[],
  };
}

export async function fetchInventory(mode: AtelierMode): Promise<{ stock: Stock }> {
  if (mode === 'remote') return getJson('/api/atelier/inventory');
  mem = loadPersisted();
  return { stock: mem.stock };
}

export async function fetchCraft(mode: AtelierMode): Promise<{ job: CraftJob | null }> {
  if (mode === 'remote') return getJson('/api/atelier/craft');
  mem = loadPersisted();
  return { job: mem.job };
}

export async function startCraft(mode: AtelierMode, recipeId: string): Promise<{ stock: Stock; job: CraftJob }> {
  if (mode === 'remote') {
    const r = await fetch('/api/atelier/craft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId }),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || 'craft failed');
    return body;
  }

  mem = loadPersisted();
  const recipe = (recipes as Recipe[]).find((x) => x.id === recipeId);
  if (!recipe) throw new Error('unknown_recipe');
  const demoRecipe = { ...recipe, durationSec: effectiveDurationSec(recipe, mode) };
  const result = applyStart(mem.stock, demoRecipe, Date.now(), mem.job);
  if (!result.ok || !result.job) throw new Error(result.error || 'craft failed');
  mem = { stock: result.stock, job: result.job };
  savePersisted(mem);
  return { stock: mem.stock, job: result.job };
}

export async function completeCraft(mode: AtelierMode): Promise<{ stock: Stock; job: null }> {
  if (mode === 'remote') {
    const r = await fetch('/api/atelier/craft/complete', { method: 'POST' });
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || 'complete failed');
    return body;
  }

  mem = loadPersisted();
  if (!mem.job) throw new Error('no_craft');
  const result = applyComplete(mem.stock, mem.job, Date.now());
  if (!result.ok) throw new Error(result.error || 'complete failed');
  mem = { stock: result.stock, job: null };
  savePersisted(mem);
  return { stock: mem.stock, job: null };
}

export async function resetInventory(mode: AtelierMode): Promise<{ stock: Stock; job: null }> {
  if (mode === 'remote') {
    const r = await fetch('/api/atelier/inventory/reset', { method: 'POST' });
    if (!r.ok) throw new Error('reset failed');
    return r.json();
  }
  mem = { stock: { ...seedStock }, job: null };
  savePersisted(mem);
  return { stock: mem.stock, job: null };
}
