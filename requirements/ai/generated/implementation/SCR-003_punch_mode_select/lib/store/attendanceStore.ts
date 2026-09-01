import { create } from 'zustand';
import { PunchType } from '@/features/attendance/domain/types';

interface AttendanceState {
  punchType: PunchType | null;
  setPunchType: (punchType: PunchType | null) => void;
  clear: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  punchType: null,
  setPunchType: (punchType) => set({ punchType }),
  clear: () => set({ punchType: null }),
}));
