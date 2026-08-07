import { z } from 'zod';

export const LocalizedNameSchema = z.object({
  zh: z.string(),
  en: z.string(),
});

export const SubstanceSchema = z.object({
  id: z.string().min(1),
  name: LocalizedNameSchema,
  kind: z.string().min(1),
  formula: z.string().nullable(),
  traits: z.array(z.string()),
  rarity: z.string(),
  icon: z.string(),
});

export const RecipeIOSchema = z.object({
  substanceId: z.string().min(1),
  qty: z.number().positive(),
  yield: z.number().min(0).max(1).optional(),
  note: z.string().optional(),
});

export const ScienceSchema = z.object({
  summary: z.string(),
  mechanisms: z.array(z.string()),
  keywords: z.array(z.string()),
  approxRealism: z.string(),
});

export const RecipeSchema = z.object({
  id: z.string().min(1),
  domain: z.enum(['alchemy', 'kitchen', 'physics']),
  name: LocalizedNameSchema,
  station: z.string(),
  process: z.string(),
  inputs: z.array(RecipeIOSchema).min(1),
  outputs: z.array(RecipeIOSchema).min(1),
  durationSec: z.number().nonnegative(),
  heat: z.string(),
  science: ScienceSchema,
  icon: z.string(),
});

export const CatalogSchema = z.object({
  substances: z.array(SubstanceSchema),
  recipes: z.array(RecipeSchema),
});

export const CraftRequestSchema = z.object({
  recipeId: z.string().min(1),
});

export type Substance = z.infer<typeof SubstanceSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type CraftRequest = z.infer<typeof CraftRequestSchema>;
