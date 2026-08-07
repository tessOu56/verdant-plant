export type StockLine = { substanceId: string; qty: number };
export type OutputLine = { substanceId: string; qty: number; yield?: number };
export type Recipe = {
  id: string;
  inputs: StockLine[];
  outputs: OutputLine[];
  durationSec: number;
};
export type Stock = Record<string, number>;
export type CraftJob = {
  recipeId: string;
  startedAt: number;
  readyAt: number;
  pendingOutputs: StockLine[];
};

export function canCraft(
  stock: Stock,
  recipe: Recipe
): { ok: true } | { ok: false; error: string };

export function floorYield(o: OutputLine): number;

export function computePendingOutputs(recipe: Recipe): StockLine[];

export function applyStart(
  stock: Stock,
  recipe: Recipe,
  now?: number,
  existing?: CraftJob | null
): { ok: boolean; error?: string; stock: Stock; job: CraftJob | null };

export function applyComplete(
  stock: Stock,
  job: CraftJob,
  now?: number
): { ok: boolean; error?: string; stock: Stock; job: CraftJob | null };
