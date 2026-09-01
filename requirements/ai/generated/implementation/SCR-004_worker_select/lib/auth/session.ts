export interface SessionUser {
  user_id: string;
  contractor_id: string | null;
  role: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
  display_name: string;
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const userStr = sessionStorage.getItem('session_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setSessionUser(user: SessionUser) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('session_user', JSON.stringify(user));
}

export function clearSessionUser() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('session_user');
}
