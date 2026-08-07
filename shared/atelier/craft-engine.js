/** Pure RecipeEngine — zero-dep ESM for atelier-service + shared with TS tests via re-export. */

/**
 * @typedef {{ substanceId: string, qty: number }} StockLine
 * @typedef {{ substanceId: string, qty: number, yield?: number }} OutputLine
 * @typedef {{ id: string, inputs: StockLine[], outputs: OutputLine[], durationSec: number }} Recipe
 * @typedef {Record<string, number>} Stock
 * @typedef {{ recipeId: string, startedAt: number, readyAt: number, pendingOutputs: StockLine[] }} CraftJob
 */

/** @param {Stock} stock @param {Recipe} recipe */
export function canCraft(stock, recipe) {
  for (const line of recipe.inputs) {
    if ((stock[line.substanceId] ?? 0) < line.qty) {
      return { ok: false, error: `insufficient:${line.substanceId}` };
    }
  }
  return { ok: true };
}

/** @param {OutputLine} o */
export function floorYield(o) {
  return Math.floor(o.qty * (o.yield ?? 1));
}

/** @param {Recipe} recipe */
export function computePendingOutputs(recipe) {
  return recipe.outputs.map((o) => ({
    substanceId: o.substanceId,
    qty: floorYield(o),
  }));
}

/**
 * Deduct inputs and create job. Does not mutate if canCraft fails.
 * @param {Stock} stock
 * @param {Recipe} recipe
 * @param {number} now
 * @param {CraftJob | null} existing
 */
export function applyStart(stock, recipe, now = Date.now(), existing = null) {
  if (existing) return { ok: false, error: 'craft_in_progress', stock, job: existing };
  const check = canCraft(stock, recipe);
  if (!check.ok) return { ok: false, error: check.error, stock, job: null };

  const next = { ...stock };
  for (const line of recipe.inputs) {
    next[line.substanceId] = (next[line.substanceId] ?? 0) - line.qty;
  }
  const job = {
    recipeId: recipe.id,
    startedAt: now,
    readyAt: now + recipe.durationSec * 1000,
    pendingOutputs: computePendingOutputs(recipe),
  };
  return { ok: true, stock: next, job };
}

/**
 * @param {Stock} stock
 * @param {CraftJob} job
 * @param {number} now
 */
export function applyComplete(stock, job, now = Date.now()) {
  if (!job) return { ok: false, error: 'no_craft', stock, job: null };
  if (now < job.readyAt) return { ok: false, error: 'not_ready', stock, job };
  const next = { ...stock };
  for (const line of job.pendingOutputs) {
    next[line.substanceId] = (next[line.substanceId] ?? 0) + line.qty;
  }
  return { ok: true, stock: next, job: null };
}
