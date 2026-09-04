'use client';

import { create } from 'zustand';

interface Session {
  user_id: string;
  role: string;
  display_name: string;
  contractor_id: string | null;
}

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  login: (session: Session) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  login: (session) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_session', JSON.stringify(session));
    }
    set({ session, isLoading: false });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth_session');
    }
    set({ session: null, isLoading: false });
  },
  initialize: () => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('auth_session');
      if (stored) {
        try {
          const session = JSON.parse(stored);
          set({ session, isLoading: false });
          return;
        } catch (e) {
          sessionStorage.removeItem('auth_session');
        }
      }
    }
    set({ session: null, isLoading: false });
  },
}));