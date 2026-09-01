export interface MockUserSession {
  userId: string;
  role: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
  contractorId: string | null;
  displayName: string;
}

export function getSession(): MockUserSession | null {
  if (typeof window === 'undefined') return null;

  const userId = sessionStorage.getItem('user_id');
  const role = sessionStorage.getItem('role') as MockUserSession['role'] | null;
  const contractorId = sessionStorage.getItem('contractor_id');
  const displayName = sessionStorage.getItem('display_name') || '外注先管理者';

  if (!userId || !role) return null;

  return {
    userId,
    role,
    contractorId,
    displayName
  };
}

export function setMockSession(session: MockUserSession): void {
  if (typeof window === 'undefined') return;

  sessionStorage.setItem('user_id', session.userId);
  sessionStorage.setItem('role', session.role);
  if (session.contractorId) {
    sessionStorage.setItem('contractor_id', session.contractorId);
  } else {
    sessionStorage.removeItem('contractor_id');
  }
  sessionStorage.setItem('display_name', session.displayName);
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;

  sessionStorage.removeItem('user_id');
  sessionStorage.removeItem('role');
  sessionStorage.removeItem('contractor_id');
  sessionStorage.removeItem('display_name');
}
"
    },
    {