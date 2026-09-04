import { Role } from '@/features/worker/domain/worker';

export interface UserSession {
  userId: string;
  contractorId: string | null;
  role: Role;
  displayName: string;
}

const SESSION_KEY = 'worker_app_session';

export function getSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  const data = sessionStorage.getItem(SESSION_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as UserSession;
  } catch {
    return null;
  }
}

export function setSession(session: UserSession): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}