import { Role } from '@/features/user/domain/user';

export interface SessionInfo {
  userId: string;
  displayName: string;
  role: Role;
  token: string;
}

const SESSION_KEY = 'worker_attendance_admin_session';

export const sessionStore = {
  save(session: SessionInfo): void {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save session to sessionStorage', e);
    }
  },

  get(): SessionInfo | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = window.sessionStorage.getItem(SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.error('Failed to clear session from sessionStorage', e);
    }
  }
};