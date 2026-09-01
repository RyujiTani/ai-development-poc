export interface Session {
  user_id: string;
  contractor_id: string | null;
  role: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
  display_name: string;
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const userId = sessionStorage.getItem('user_id');
  const role = sessionStorage.getItem('role') as Session['role'] | null;
  const contractorId = sessionStorage.getItem('contractor_id');
  const displayName = sessionStorage.getItem('display_name') || 'デモユーザー';

  if (!userId || !role) return null;

  return {
    user_id: userId,
    contractor_id: contractorId,
    role,
    display_name: displayName
  };
}

export function setSession(session: Session): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('user_id', session.user_id);
  sessionStorage.setItem('role', session.role);
  if (session.contractor_id) {
    sessionStorage.setItem('contractor_id', session.contractor_id);
  } else {
    sessionStorage.removeItem('contractor_id');
  }
  sessionStorage.setItem('display_name', session.display_name);
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