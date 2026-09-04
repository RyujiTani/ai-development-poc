import { create } from 'zustand';
import { PunchType } from '../domain/types';

interface PunchState {
  punchMode: PunchType | null;
  setPunchMode: (mode: PunchType | null) => void;
  clearPunchMode: () => void;
}

export const usePunchStore = create<PunchState>((set) => ({
  punchMode: null,
  setPunchMode: (mode) => set({ punchMode: mode }),
  clearPunchMode: () => set({ punchMode: null }),
}));