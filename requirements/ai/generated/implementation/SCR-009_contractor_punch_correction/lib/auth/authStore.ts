'use client';

import { Role } from '@/features/attendance/domain/types';

export interface AuthSession {
  userId: string;
  contractorId: string | null;
  role: Role;
  displayName: string;
}

const SESSION_KEY = 'worker_attendance_session';

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const data = sessionStorage.getItem(SESSION_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as AuthSession;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}

// デモ用にデフォルト外注先管理者セッションを自動確立する関数
export function ensureDemoSession(): AuthSession {
  const current = getSession();
  if (current) return current;

  const demoSession: AuthSession = {
    userId: 'user-manager-A',
    contractorId: 'contractor-A',
    role: 'CONTRACTOR_MANAGER',
    displayName: '山田 太郎 (デモ管理者)',
  };
  setSession(demoSession);
  return demoSession;
}