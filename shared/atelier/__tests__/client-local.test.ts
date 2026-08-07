import { beforeEach, describe, expect, it } from 'vitest';

const store = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true });

// Import after mock so client module sees localStorage
const { completeCraft, fetchCraft, fetchInventory, resetInventory, startCraft } = await import('../../../src/atelier/client');

describe('atelier client local mode', () => {
  beforeEach(async () => {
    store.clear();
    await resetInventory('local');
  });

  it('persists stock across craft complete', async () => {
    const before = await fetchInventory('local');
    expect(before.stock.malachite).toBeGreaterThanOrEqual(2);

    await startCraft('local', 'smelt_copper');
    const mid = await fetchCraft('local');
    expect(mid.job?.recipeId).toBe('smelt_copper');

    const raw = JSON.parse(localStorage.getItem('verdant.atelier.v1')!);
    raw.job.readyAt = Date.now() - 1;
    localStorage.setItem('verdant.atelier.v1', JSON.stringify(raw));

    const done = await completeCraft('local');
    expect(done.job).toBeNull();
    expect(done.stock.copper_metal).toBeGreaterThanOrEqual(1);

    const again = await fetchInventory('local');
    expect(again.stock.copper_metal).toBe(done.stock.copper_metal);
  });
});
