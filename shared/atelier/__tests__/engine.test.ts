import { describe, expect, it } from 'vitest';
import { CatalogSchema } from '../schema';
import { applyComplete, applyStart, canCraft, floorYield } from '../engine';
import substances from '../substances.json';
import recipes from '../recipes.json';
import seedStock from '../inventory.seed.json';

describe('atelier catalog', () => {
  it('parses substances + recipes with Zod', () => {
    const parsed = CatalogSchema.parse({ substances, recipes });
    expect(parsed.substances.length).toBeGreaterThan(10);
    expect(parsed.recipes.some((r) => r.id === 'smelt_copper')).toBe(true);
    expect(parsed.recipes.some((r) => r.id === 'emulsify_mayo')).toBe(true);
    expect(parsed.recipes.some((r) => r.id === 'evaporate_brine')).toBe(true);
  });
});

function recipe(id: string) {
  const r = recipes.find((x) => x.id === id);
  if (!r) throw new Error(`missing ${id}`);
  return r;
}

describe('RecipeEngine', () => {
  it('smelt_copper: deducts ore and yields copper via floor(qty*yield)', () => {
    const r = recipe('smelt_copper');
    const expected = floorYield(r.outputs[0]);
    expect(expected).toBeGreaterThanOrEqual(1);

    const start = applyStart({ ...seedStock }, r, 1_000);
    expect(start.ok).toBe(true);
    expect(start.stock.malachite).toBe(seedStock.malachite - 2);
    expect(start.stock.charcoal).toBe(seedStock.charcoal - 1);
    expect(start.job?.pendingOutputs[0]).toEqual({ substanceId: 'copper_metal', qty: expected });

    const done = applyComplete(start.stock, start.job!, start.job!.readyAt);
    expect(done.ok).toBe(true);
    expect(done.stock.copper_metal).toBe((seedStock.copper_metal ?? 0) + expected);
    expect(done.job).toBeNull();
  });

  it('emulsify_mayo: kitchen path succeeds', () => {
    const r = recipe('emulsify_mayo');
    const start = applyStart({ ...seedStock }, r, 2_000);
    expect(start.ok).toBe(true);
    const done = applyComplete(start.stock, start.job!, start.job!.readyAt);
    expect(done.ok).toBe(true);
    expect(done.stock.mayonnaise).toBeGreaterThanOrEqual(1);
  });

  it('evaporate_brine: physics path yields halite', () => {
    const r = recipe('evaporate_brine');
    const start = applyStart({ ...seedStock }, r, 3_000);
    expect(start.ok).toBe(true);
    const done = applyComplete(start.stock, start.job!, start.job!.readyAt);
    expect(done.ok).toBe(true);
    expect(done.stock.halite).toBeGreaterThanOrEqual(1);
  });

  it('rejects insufficient stock', () => {
    const r = recipe('smelt_copper');
    const check = canCraft({ malachite: 1, charcoal: 1 }, r);
    expect(check.ok).toBe(false);
    const start = applyStart({ malachite: 1, charcoal: 1 }, r, 0);
    expect(start.ok).toBe(false);
    expect(start.error).toMatch(/insufficient/);
  });

  it('rejects second craft while one in flight', () => {
    const r = recipe('freeze_water');
    const first = applyStart({ ...seedStock }, r, 0);
    expect(first.ok).toBe(true);
    const second = applyStart(first.stock, recipe('boil_water'), 1, first.job);
    expect(second.ok).toBe(false);
    expect(second.error).toBe('craft_in_progress');
  });

  it('complete before readyAt fails', () => {
    const r = recipe('smelt_copper');
    const start = applyStart({ ...seedStock }, r, 0);
    const early = applyComplete(start.stock, start.job!, start.job!.readyAt - 1);
    expect(early.ok).toBe(false);
    expect(early.error).toBe('not_ready');
  });
});
