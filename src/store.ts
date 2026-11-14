import { create } from 'zustand';

// What is left of the legacy store: the showcase, which belongs to `vitrine` (the throw's state is in `arremesso`,
// OS-0031; the rest went to `pressagios`, OS-0038).
interface DiceState {
  showcased: number; // throwId whose dice finished flying to the front
  setShowcased: (throwId: number) => void;
}

export const useDice = create<DiceState>((set) => ({
  showcased: 0,
  setShowcased: (showcased) => set({ showcased }),
}));
