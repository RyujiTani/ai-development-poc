'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface SessionUser {
  userId: string;
  contractorId: string | null; // null = 工場側管理者
  role: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
  displayName: string;
}

export function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const sessionStr = sessionStorage.getItem('mock_session');
  if (!sessionStr) return null;
  try {
    return JSON.parse(sessionStr);
  } catch {
    return null;
  }
}

export function setSession(user: SessionUser): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('mock_session', JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('mock_session');
}

export function useAuth(requiredRole?: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER') {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (requiredRole && session.role !== requiredRole) {
      router.replace('/login');
      return;
    }
    setUser(session);
    setLoading(false);
  }, [router, requiredRole]);

  return { user, loading };
}