import { Role } from '@/features/attendance/domain/types';

export interface UserSession {
  userId: string;
  contractorId: string | null;
  role: Role;
  displayName: string;
}

const SESSION_KEY = 'worker_attendance_session';

export class SessionStore {
  public getSession(): UserSession | null {
    if (typeof window === 'undefined') return null;
    const item = sessionStorage.getItem(SESSION_KEY);
    if (!item) return null;
    try {
      return JSON.parse(item) as UserSession;
    } catch {
      return null;
    }
  }

  public setSession(session: UserSession): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  public clearSession(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(SESSION_KEY);
  }

  public setMockSessionContractor(): void {
    this.setSession({
      userId: 'USR-001',
      contractorId: 'CON-001',
      role: 'CONTRACTOR_MANAGER',
      displayName: '山田 太郎（管理者）'
    });
  }
}

export const sessionStore = new SessionStore();