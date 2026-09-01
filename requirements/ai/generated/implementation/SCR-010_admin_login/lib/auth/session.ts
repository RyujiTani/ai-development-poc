export interface Session {
  userId: string | null;
  role: string | null;
}

export const getSession = (): Session => {
  if (typeof window === 'undefined') return { userId: null, role: null };
  return {
    userId: sessionStorage.getItem('user_id'),
    role: sessionStorage.getItem('role')
  };
};

export const setSession = (userId: string, role: string): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('user_id', userId);
  sessionStorage.setItem('role', role);
};

export const clearSession = (): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('user_id');
  sessionStorage.removeItem('role');
};
"
    },
    {