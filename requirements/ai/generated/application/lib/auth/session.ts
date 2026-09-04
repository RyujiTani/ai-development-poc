import { Role } from '../../features/user/domain/user';

export interface Session {
  user_id: string;
  role: Role;
  display_name: string;
}

export const sessionManager = {
  saveSession(session: Session): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('user_id', session.user_id);
      sessionStorage.setItem('role', session.role);
      sessionStorage.setItem('display_name', session.display_name);
    }
  },

  getSession(): Session | null {
    if (typeof window === 'undefined') return null;
    const user_id = sessionStorage.getItem('user_id');
    const role = sessionStorage.getItem('role') as Role | null;
    const display_name = sessionStorage.getItem('display_name');

    if (user_id && role && display_name) {
      return { user_id, role, display_name };
    }
    return null;
  },

  clearSession(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user_id');
      sessionStorage.removeItem('role');
      sessionStorage.removeItem('display_name');
    }
  },
};