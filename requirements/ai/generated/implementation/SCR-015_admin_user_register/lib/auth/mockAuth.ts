import { Role } from '@/features/user/domain/user';

export interface Session {
  user_id: string;
  login_id: string;
  display_name: string;
  role: Role;
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const sessionStr = sessionStorage.getItem('user-session');
  if (!sessionStr) return null;
  try {
    return JSON.parse(sessionStr);
  } catch {
    return null;
  }
}

export function setSession(session: Session) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('user-session', JSON.stringify(session));
  }
}

export function clearSession() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('user-session');
  }
}