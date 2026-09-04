import { create } from 'zustand';

export type PunchType = 'CLOCK_IN' | 'CLOCK_OUT';

export interface PunchResult {
  punchType: PunchType;
  workerCount: number;
  timestamp: string;
}

interface AttendanceState {
  lastPunchResult: PunchResult | null;
  setPunchResult: (result: PunchResult | null) => void;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  lastPunchResult: null,
  setPunchResult: (result) => set({ lastPunchResult: result }),
}));