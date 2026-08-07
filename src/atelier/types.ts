export type Domain = 'alchemy' | 'kitchen' | 'physics' | 'all';
export type Localized = { zh: string; en: string };

export type Substance = {
  id: string;
  name: Localized;
  kind: string;
  formula: string | null;
  icon: string;
  traits: string[];
  rarity?: string;
};

export type Recipe = {
  id: string;
  domain: Exclude<Domain, 'all'>;
  name: Localized;
  station: string;
  process: string;
  inputs: { substanceId: string; qty: number }[];
  outputs: { substanceId: string; qty: number; yield?: number }[];
  durationSec: number;
  heat: string;
  icon: string;
  science: {
    summary: string;
    mechanisms: string[];
    keywords: string[];
    approxRealism: string;
  };
};

export type CraftJob = {
  recipeId: string;
  startedAt: number;
  readyAt: number;
  pendingOutputs: { substanceId: string; qty: number }[];
};

export type Stock = Record<string, number>;

export type AtelierMode = 'local' | 'remote';
