import { create } from 'zustand';

export type PunchType = 'CLOCK_IN' | 'CLOCK_OUT';

export interface PunchSummary {
  punchType: PunchType;
  workerCount: number;
}

export interface AttendanceStore {
  punchType: PunchType | null;
  selectedWorkerIds: string[];
  lastPunchSummary: PunchSummary | null;
  setPunchType: (punchType: PunchType | null) => void;
  setSelectedWorkerIds: (ids: string[]) => void;
  setLastPunchSummary: (summary: PunchSummary | null) => void;
  clearAttendanceSession: () => void;
}

export const useAttendanceStore = create<AttendanceStore>((set) => ({
  punchType: null,
  selectedWorkerIds: [],
  lastPunchSummary: null,
  setPunchType: (punchType) => set({ punchType }),
  setSelectedWorkerIds: (selectedWorkerIds) => set({ selectedWorkerIds }),
  setLastPunchSummary: (lastPunchSummary) => set({ lastPunchSummary }),
  clearAttendanceSession: () => set({ punchType: null, selectedWorkerIds: [] }),
}));