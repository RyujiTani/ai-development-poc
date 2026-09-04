export interface SessionUser {
  userId: string;
  displayName: string;
  role: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
  contractorId: string | null;
}

const SESSION_KEY = 'worker_auth_session';

export const sessionService = {
  getSession(): SessionUser | null {
    if (typeof window === 'undefined') return null;
    const data = sessionStorage.getItem(SESSION_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },
  setSession(user: SessionUser): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },
  clearSession(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(SESSION_KEY);
  }
};