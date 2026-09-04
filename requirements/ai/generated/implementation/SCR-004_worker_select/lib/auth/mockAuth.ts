import { User } from '@/features/attendance/domain/types';

export function getSessionUser(): User | null {
  if (typeof window === 'undefined') return null;
  const session = sessionStorage.getItem('auth_session');
  if (!session) return null;
  try {
    return JSON.parse(session) as User;
  } catch {
    return null;
  }
}

export function setSessionUser(user: User): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('auth_session', JSON.stringify(user));
}

export function clearSessionUser(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('auth_session');
}