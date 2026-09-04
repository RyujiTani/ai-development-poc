import { Role } from '@/features/user/domain/user';

export interface UserSession {
  userId: string;
  role: Role;
  displayName: string;
  token: string;
}

export const sessionStore = {
  save(session: UserSession): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('session_user_id', session.userId);
      sessionStorage.setItem('session_role', session.role);
      sessionStorage.setItem('session_display_name', session.displayName);
      sessionStorage.setItem('session_token', session.token);
    }
  },
  get(): UserSession | null {
    if (typeof window === 'undefined') return null;
    const userId = sessionStorage.getItem('session_user_id');
    const role = sessionStorage.getItem('session_role') as Role | null;
    const displayName = sessionStorage.getItem('session_display_name');
    const token = sessionStorage.getItem('session_token');

    if (userId && role && displayName && token) {
      return { userId, role, displayName, token };
    }
    return null;
  },
  clear(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('session_user_id');
      sessionStorage.removeItem('session_role');
      sessionStorage.removeItem('session_display_name');
      sessionStorage.removeItem('session_token');
    }
  }
};