import React, { createContext, useContext, useState, useEffect } from 'react';
import { PunchType } from '../../worker/domain/worker';

interface AttendanceContextType {
  punchMode: PunchType;
  setPunchMode: (mode: PunchType) => void;
  selectedWorkerIds: string[];
  setSelectedWorkerIds: (ids: string[]) => void;
  clearAttendanceState: () => void;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [punchMode, setPunchModeState] = useState<PunchType>('CLOCK_IN');
  const [selectedWorkerIds, setSelectedWorkerIdsState] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = sessionStorage.getItem('attendance_punch_mode') as PunchType;
      if (savedMode) {
        setPunchModeState(savedMode);
      } else {
        sessionStorage.setItem('attendance_punch_mode', 'CLOCK_IN');
      }
      
      const savedIds = sessionStorage.getItem('attendance_selected_worker_ids');
      if (savedIds) {
        try {
          setSelectedWorkerIdsState(JSON.parse(savedIds));
        } catch {
          setSelectedWorkerIdsState([]);
        }
      }
    }
  }, []);

  const setPunchMode = (mode: PunchType) => {
    setPunchModeState(mode);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('attendance_punch_mode', mode);
    }
  };

  const setSelectedWorkerIds = (ids: string[]) => {
    setSelectedWorkerIdsState(ids);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('attendance_selected_worker_ids', JSON.stringify(ids));
    }
  };

  const clearAttendanceState = () => {
    setPunchModeState('CLOCK_IN');
    setSelectedWorkerIdsState([]);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('attendance_punch_mode');
      sessionStorage.removeItem('attendance_selected_worker_ids');
    }
  };

  return (
    <AttendanceContext.Provider value={{
      punchMode,
      setPunchMode,
      selectedWorkerIds,
      setSelectedWorkerIds,
      clearAttendanceState
    }}>
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};
