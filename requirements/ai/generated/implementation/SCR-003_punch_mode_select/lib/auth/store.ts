import { create } from 'zustand';
import { User } from '@/features/attendance/domain/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_user', JSON.stringify(user));
    }
    set({ user, isAuthenticated: true });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth_user');
    }
    set({ user: null, isAuthenticated: false });
  },
  initialize: () => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('auth_user');
      if (stored) {
        try {
          const user = JSON.parse(stored) as User;
          set({ user, isAuthenticated: true });
        } catch {
          sessionStorage.removeItem('auth_user');
          set({ user: null, isAuthenticated: false });
        }
      }
    }
  },
}));