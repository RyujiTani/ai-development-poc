import { User, Role } from '../../features/attendance/domain/types';

const SESSION_KEY = 'worker_attendance_session';

export function getSession(): User | null {
  if (typeof window === 'undefined') return null;
  const session = sessionStorage.getItem(SESSION_KEY);
  if (!session) return null;
  try {
    return JSON.parse(session) as User;
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

export function checkAuth(requiredRole?: Role): boolean {
  const session = getSession();
  if (!session) return false;
  if (session.status !== 'ACTIVE') return false;
  if (requiredRole && session.role !== requiredRole) return false;
  return true;
}