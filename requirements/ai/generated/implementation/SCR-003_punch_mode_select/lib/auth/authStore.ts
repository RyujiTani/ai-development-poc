import { create } from 'zustand';

export type Role = 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';

export interface User {
  user_id: string;
  contractor_id: string | null;
  role: Role;
  login_id: string;
  display_name: string;
  status: 'ACTIVE' | 'LOCKED' | 'DISABLED';
}

interface AuthState {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  login: (user) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_user', JSON.stringify(user));
    }
    set({ user });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth_user');
    }
    set({ user: null });
  },
  initialize: () => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('auth_user');
      if (stored) {
        try {
          set({ user: JSON.parse(stored) });
        } catch {
          sessionStorage.removeItem('auth_user');
        }
      }
    }
  },
}));