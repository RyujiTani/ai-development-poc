import { create } from 'zustand';
import { PunchType } from '@/features/attendance/domain/types';

interface WorkerSelectState {
  punchType: PunchType;
  selectedWorkerIds: string[];
  setPunchType: (type: PunchType) => void;
  toggleWorkerSelection: (workerId: string) => void;
  setSelectedWorkerIds: (ids: string[]) => void;
  clearSelection: () => void;
}

export const useWorkerSelectStore = create<WorkerSelectState>((set) => ({
  punchType: 'CLOCK_IN',
  selectedWorkerIds: [],
  setPunchType: (type) => set({ punchType: type }),
  toggleWorkerSelection: (workerId) =>
    set((state) => {
      const isSelected = state.selectedWorkerIds.includes(workerId);
      const nextIds = isSelected
        ? state.selectedWorkerIds.filter((id) => id !== workerId)
        : [...state.selectedWorkerIds, workerId];
      return { selectedWorkerIds: nextIds };
    }),
  setSelectedWorkerIds: (ids) => set({ selectedWorkerIds: ids }),
  clearSelection: () => set({ selectedWorkerIds: [] }),
}));