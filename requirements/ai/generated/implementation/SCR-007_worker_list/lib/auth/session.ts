import { User } from '@/features/worker/domain/types';

const SESSION_KEY = 'worker_auth_session';

export function getSession(): User | null {
  if (typeof window === 'undefined') return null;
  const sessionStr = window.sessionStorage.getItem(SESSION_KEY);
  if (!sessionStr) return null;
  try {
    return JSON.parse(sessionStr);
  } catch {
    return null;
  }
}

export function setSession(user: User): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SESSION_KEY);
}