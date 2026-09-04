import { Role } from '../../features/attendance/domain/types';

export interface SessionUser {
  user_id: string;
  contractor_id: string | null;
  role: Role;
  display_name: string;
}

export function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const sessionStr = sessionStorage.getItem('user_session');
  if (!sessionStr) return null;
  try {
    return JSON.parse(sessionStr);
  } catch {
    return null;
  }
}

export function setSession(user: SessionUser): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('user_session', JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('user_session');
}