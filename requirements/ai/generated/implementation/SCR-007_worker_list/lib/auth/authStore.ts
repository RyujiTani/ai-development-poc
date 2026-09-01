import { Role } from '@/features/worker/domain/worker';

export interface AuthUser {
  user_id: string;
  contractor_id: string;
  role: Role;
  display_name: string;
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;

  const userId = sessionStorage.getItem('user_id');
  const role = sessionStorage.getItem('role') as Role | null;
  const contractorId = sessionStorage.getItem('contractor_id');
  const displayName = sessionStorage.getItem('display_name');

  if (!userId || !role || !contractorId) {
    return null;
  }

  return {
    user_id: userId,
    contractor_id: contractorId,
    role,
    display_name: displayName || '管理者'
  };
}

export function loginMock(user: AuthUser): void {
  if (typeof window === 'undefined') return;

  sessionStorage.setItem('user_id', user.user_id);
  sessionStorage.setItem('role', user.role);
  sessionStorage.setItem('contractor_id', user.contractor_id);
  sessionStorage.setItem('display_name', user.display_name);
}

export function logoutMock(): void {
  if (typeof window === 'undefined') return;

  sessionStorage.removeItem('user_id');
  sessionStorage.removeItem('role');
  sessionStorage.removeItem('contractor_id');
  sessionStorage.removeItem('display_name');
}
"
    },
    {