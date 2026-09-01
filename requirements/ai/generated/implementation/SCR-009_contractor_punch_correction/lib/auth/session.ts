export interface SessionUser {
  userId: string;
  contractorId: string | null;
  role: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
  displayName: string;
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const userId = sessionStorage.getItem('user_id');
  const role = sessionStorage.getItem('role') as SessionUser['role'] | null;
  const contractorId = sessionStorage.getItem('contractor_id');
  const displayName = sessionStorage.getItem('display_name') || '管理者';

  if (!userId || !role) return null;

  return {
    userId,
    contractorId,
    role,
    displayName,
  };
}

export function saveSessionUser(user: SessionUser): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('user_id', user.userId);
  sessionStorage.setItem('role', user.role);
  if (user.contractorId) {
    sessionStorage.setItem('contractor_id', user.contractorId);
  } else {
    sessionStorage.removeItem('contractor_id');
  }
  sessionStorage.setItem('display_name', user.displayName);
}

export function clearSessionUser(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('user_id');
  sessionStorage.removeItem('role');
  sessionStorage.removeItem('contractor_id');
  sessionStorage.removeItem('display_name');
}
