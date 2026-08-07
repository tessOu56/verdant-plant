/**
 * Typed façade over craft-engine.js for Vite / Vitest.
 * Runtime craft logic stays in craft-engine.js (Node zero-dep service).
 */
export {
  canCraft,
  floorYield,
  computePendingOutputs,
  applyStart,
  applyComplete,
} from './craft-engine.js';

export type Stock = Record<string, number>;
export type StockLine = { substanceId: string; qty: number };
export type CraftJob = {
  recipeId: string;
  startedAt: number;
  readyAt: number;
  pendingOutputs: StockLine[];
};
