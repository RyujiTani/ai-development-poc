import { create } from 'zustand';
import { PunchType } from '@/features/worker/domain/worker';

interface AttendanceState {
  punchMode: PunchType;
  selectedWorkerIds: string[];
  setPunchMode: (mode: PunchType) => void;
  setSelectedWorkerIds: (ids: string[]) => void;
  reset: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  punchMode: 'CLOCK_IN',
  selectedWorkerIds: [],
  setPunchMode: (mode) => set({ punchMode: mode }),
  setSelectedWorkerIds: (ids) => set({ selectedWorkerIds: ids }),
  reset: () => set({ selectedWorkerIds: [] }),
}));