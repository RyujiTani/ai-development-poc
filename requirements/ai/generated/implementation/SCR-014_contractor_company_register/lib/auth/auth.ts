import { Role } from '@/features/contractor/domain/contractor';

export interface Session {
  userId: string;
  role: Role;
  displayName: string;
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const sessionStr = sessionStorage.getItem('user_session');
  if (!sessionStr) return null;
  try {
    return JSON.parse(sessionStr) as Session;
  } catch {
    return null;
  }
}

export function setMockSession(session: Session) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('user_session', JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('user_session');
}