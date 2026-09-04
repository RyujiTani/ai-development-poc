import { Role } from '@/features/user/domain/user';

export interface Session {
  user_id: string;
  role: Role;
  display_name: string;
}

let inMemorySession: Session | null = {
  user_id: 'admin-1',
  role: 'FACTORY_ADMIN',
  display_name: '工場管理者 鈴木',
};

export function getSession(): Session | null {
  if (typeof window === 'undefined') {
    return inMemorySession;
  }
  const sessionStr = sessionStorage.getItem('mock_session');
  if (!sessionStr) return null;
  try {
    return JSON.parse(sessionStr);
  } catch {
    return null;
  }
}

export function setSession(session: Session) {
  if (typeof window === 'undefined') {
    inMemorySession = session;
    return;
  }
  sessionStorage.setItem('mock_session', JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === 'undefined') {
    inMemorySession = null;
    return;
  }
  sessionStorage.removeItem('mock_session');
}