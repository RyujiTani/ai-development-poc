import { PunchType } from '../domain/types';

export interface AttendanceSessionState {
  punchMode: PunchType;
  selectedWorkerIds: string[];
}

const SESSION_KEY = 'worker_attendance_state_sharing';

export function saveAttendanceSession(state: AttendanceSessionState): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  }
}

export function getAttendanceSession(): AttendanceSessionState {
  if (typeof window !== 'undefined') {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // Fallback below
      }
    }
  }
  return {
    punchMode: 'CLOCK_IN',
    selectedWorkerIds: []
  };
}

export function clearAttendanceSession(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_KEY);
  }
}
"
    },
    {