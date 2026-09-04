import { create } from 'zustand';

export type PunchType = 'CLOCK_IN' | 'CLOCK_OUT';

interface AttendanceState {
  punchType: PunchType | null;
  selectedWorkerIds: string[];
  setPunchType: (type: PunchType | null) => void;
  setSelectedWorkerIds: (ids: string[]) => void;
  reset: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  punchType: null,
  selectedWorkerIds: [],
  setPunchType: (punchType) => set({ punchType }),
  setSelectedWorkerIds: (selectedWorkerIds) => set({ selectedWorkerIds }),
  reset: () => set({ punchType: null, selectedWorkerIds: [] }),
}));