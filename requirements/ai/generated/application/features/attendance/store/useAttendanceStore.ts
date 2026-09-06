import { create } from 'zustand';

export type PunchType = 'CLOCK_IN' | 'CLOCK_OUT';

interface AttendanceState {
  punchType: PunchType | null;
  selectedWorkerIds: string[];
  setPunchType: (type: PunchType | null) => void;
  setSelectedWorkerIds: (ids: string[]) => void;
  clear: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  punchType: null,
  selectedWorkerIds: [],
  setPunchType: (type) => set({ punchType: type }),
  setSelectedWorkerIds: (ids) => set({ selectedWorkerIds: ids }),
  clear: () => set({ punchType: null, selectedWorkerIds: [] }),
}));