import { create } from 'zustand';

export type Plant = { id: number; stage: number; species: string; blooming: boolean };

type GardenState = {
  water: number;
  sunlight: number;
  plants: Record<number, Plant>;
  lowDevice: boolean;
  addWater: (n: number) => void;
  spend: (n: number) => boolean;
  setPlants: (p: Plant[]) => void;
  upsertPlant: (p: Plant) => void;
  toggleLowDevice: () => void;
};

// Zustand 全域狀態：花園資源與植株。selector 訂閱，避免不必要 re-render。
export const useGarden = create<GardenState>((set, get) => ({
  water: 60,
  sunlight: 40,
  plants: {},
  lowDevice: false,
  addWater: (n) => set((s) => ({ water: s.water + n })),
  spend: (n) => {
    if (get().water < n) return false;
    set((s) => ({ water: s.water - n }));
    return true;
  },
  setPlants: (p) => set(() => ({ plants: Object.fromEntries(p.map((x) => [x.id, x])) })),
  upsertPlant: (p) => set((s) => ({ plants: { ...s.plants, [p.id]: p } })),
  toggleLowDevice: () => set((s) => ({ lowDevice: !s.lowDevice })),
}));
