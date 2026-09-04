export interface AuthSession {
  userId: string;
  role: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
  displayName: string;
  contractorId: string | null;
}

const SESSION_KEY = 'worker_attendance_session';

export function saveSession(session: AuthSession): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

export function getSession(): AuthSession | null {
  if (typeof window !== 'undefined') {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  }
  return null;
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(SESSION_KEY);
  }
}

export function isAuthenticated(role?: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER'): boolean {
  const session = getSession();
  if (!session) return false;
  if (role && session.role !== role) return false;
  return true;
}