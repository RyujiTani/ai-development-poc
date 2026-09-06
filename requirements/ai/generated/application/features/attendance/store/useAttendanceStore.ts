import { create } from 'zustand';
import { PunchType } from '../domain/types';

interface AttendanceState {
  punchMode: PunchType | null;
  setPunchMode: (mode: PunchType | null) => void;
  selectedWorkerIds: string[];
  setSelectedWorkerIds: (ids: string[]) => void;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  punchMode: null,
  setPunchMode: (mode) => set({ punchMode: mode }),
  selectedWorkerIds: [],
  setSelectedWorkerIds: (ids) => set({ selectedWorkerIds: ids }),
}));