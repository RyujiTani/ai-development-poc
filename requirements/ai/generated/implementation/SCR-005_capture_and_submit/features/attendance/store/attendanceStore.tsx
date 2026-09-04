'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PunchType } from '../domain/types';

interface AttendanceContextType {
  selectedWorkerIds: string[];
  punchType: PunchType;
  setSelection: (workerIds: string[], type: PunchType) => void;
  clearSelection: () => void;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [punchType, setPunchType] = useState<PunchType>('CLOCK_IN');

  const setSelection = (workerIds: string[], type: PunchType) => {
    setSelectedWorkerIds(workerIds);
    setPunchType(type);
  };

  const clearSelection = () => {
    setSelectedWorkerIds([]);
    setPunchType('CLOCK_IN');
  };

  return (
    <AttendanceContext.Provider
      value={{ selectedWorkerIds, punchType, setSelection, clearSelection }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendanceContext() {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendanceContext must be used within an AttendanceProvider');
  }
  return context;
}