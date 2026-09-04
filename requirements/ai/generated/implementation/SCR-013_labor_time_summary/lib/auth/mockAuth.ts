import { User } from '../../features/attendance/domain/types';

const SESSION_KEY = 'worker_attendance_user_session';

export function getSession(): User | null {
  if (typeof window === 'undefined') return null;
  const sessionStr = sessionStorage.getItem(SESSION_KEY);
  if (!sessionStr) return null;
  try {
    return JSON.parse(sessionStr) as User;
  } catch {
    return null;
  }
}

export function setSession(user: User): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function hasRole(role: string): boolean {
  const session = getSession();
  return session?.role === role;
}