import { create } from 'zustand';

export interface UserSession {
  userId: string;
  contractorId: string | null; // null = 工場側管理者, string = 外注先
  role: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
  displayName: string;
}

interface SessionState {
  session: UserSession | null;
  isLoading: boolean;
  setSession: (session: UserSession | null) => void;
  initialize: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  isLoading: true,
  setSession: (session) => {
    if (typeof window !== 'undefined') {
      if (session) {
        sessionStorage.setItem('session', JSON.stringify(session));
      } else {
        sessionStorage.removeItem('session');
      }
    }
    set({ session });
  },
  initialize: () => {
    if (typeof window !== 'undefined') {
      const raw = sessionStorage.getItem('session');
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as UserSession;
          set({ session: parsed, isLoading: false });
          return;
        } catch {
          // ignore parsing error
        }
      }
    }
    set({ session: null, isLoading: false });
  }
}));