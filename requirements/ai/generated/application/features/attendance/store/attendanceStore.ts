import { create } from "zustand";

export type PunchType = "CLOCK_IN" | "CLOCK_OUT";

interface AttendanceState {
  punchType: PunchType | null;
  setPunchType: (type: PunchType | null) => void;
  selectedWorkerIds: string[];
  setSelectedWorkerIds: (ids: string[]) => void;
  clear: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  punchType: null,
  selectedWorkerIds: [],
  setPunchType: (punchType) => set({ punchType }),
  setSelectedWorkerIds: (selectedWorkerIds) => set({ selectedWorkerIds }),
  clear: () => set({ punchType: null, selectedWorkerIds: [] }),
}));