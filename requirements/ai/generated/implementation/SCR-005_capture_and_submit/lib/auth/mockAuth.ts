import { Role } from '../../features/attendance/domain/types';

export interface AuthSession {
  userId: string;
  contractorId: string | null;
  role: Role;
  displayName: string;
}

const SESSION_KEY = 'worker_attendance_mock_session';

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const data = sessionStorage.getItem(SESSION_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as AuthSession;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated(role?: Role): boolean {
  const session = getSession();
  if (!session) return false;
  if (role && session.role !== role) return false;
  return true;
}