import { create } from 'zustand';
import { PunchType } from '../domain/types';

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
  setPunchType: (type) => set({ punchType: type }),
  setSelectedWorkerIds: (ids) => set({ selectedWorkerIds: ids }),
  reset: () => set({ punchType: null, selectedWorkerIds: [] }),
}));