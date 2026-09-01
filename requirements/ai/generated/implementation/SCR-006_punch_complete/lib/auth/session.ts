export type Role = 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';

export interface UserSession {
  user_id: string;
  role: Role;
}

export const getSession = (): UserSession | null => {
  if (typeof window === 'undefined') return null;
  const userId = sessionStorage.getItem('user_id');
  const role = sessionStorage.getItem('role') as Role | null;
  if (!userId || !role) return null;
  return { user_id: userId, role };
};

export const clearSession = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('user_id');
  sessionStorage.removeItem('role');
};
"
    },
    {