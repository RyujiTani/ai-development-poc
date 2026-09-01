import { Role } from '@/features/user/domain/user';

export interface AuthSession {
  user_id: string;
  role: Role;
  display_name: string;
}

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const userId = sessionStorage.getItem('user_id');
  const role = sessionStorage.getItem('role') as Role | null;
  const displayName = sessionStorage.getItem('display_name') || '管理者';
  
  if (userId && role) {
    return { user_id: userId, role, display_name: displayName };
  }
  return null;
}

export function setSession(userId: string, role: Role, displayName: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('user_id', userId);
  sessionStorage.setItem('role', role);
  sessionStorage.setItem('display_name', displayName);
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('user_id');
  sessionStorage.removeItem('role');
  sessionStorage.removeItem('display_name');
}
"
    },
    {