import { initDB } from '@/lib/db/indexedDB';
import { User, Role } from '@/features/attendance/domain/types';
import { logger } from '@/lib/logger';

export interface LoginResult {
  success: boolean;
  user?: {
    user_id: string;
    display_name: string;
    role: Role;
    contractor_id: string | null;
  };
  error?: string;
}

export async function loginMock(loginId: string, passwordHash: string): Promise<LoginResult> {
  logger.info('LOGIN_ATTEMPT', { loginId });
  try {
    const db = await initDB();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const index = store.index('login_id');
    const user = await index.get(loginId) as User | undefined;

    if (!user) {
      logger.warn('LOGIN_FAILED_USER_NOT_FOUND', { loginId });
      return { success: false, error: 'IDまたはパスワードが正しくありません' };
    }

    if (user.status !== 'ACTIVE') {
      logger.warn('LOGIN_FAILED_USER_INACTIVE', { loginId, status: user.status });
      return { success: false, error: 'このアカウントは利用できません' };
    }

    if (user.password_hash !== passwordHash) {
      logger.warn('LOGIN_FAILED_PASSWORD_MISMATCH', { loginId });
      return { success: false, error: 'IDまたはパスワードが正しくありません' };
    }

    logger.info('LOGIN_SUCCESS', { loginId, userId: user.user_id, role: user.role });

    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('user_id', user.user_id);
      window.sessionStorage.setItem('role', user.role);
      if (user.contractor_id) {
        window.sessionStorage.setItem('contractor_id', user.contractor_id);
      } else {
        window.sessionStorage.removeItem('contractor_id');
      }
    }

    const updateTx = db.transaction('users', 'readwrite');
    const updateStore = updateTx.objectStore('users');
    user.last_login_at = new Date().toISOString();
    await updateStore.put(user);
    await updateTx.done;

    const auditTx = db.transaction('audit_logs', 'readwrite');
    const auditStore = auditTx.objectStore('audit_logs');
    const auditId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    await auditStore.put({
      audit_id: auditId,
      occurred_at: new Date().toISOString(),
      actor_user_id: user.user_id,
      actor_role: user.role,
      action: 'LOGIN',
      detail: { login_id: loginId }
    });
    await auditTx.done;

    return {
      success: true,
      user: {
        user_id: user.user_id,
        display_name: user.display_name,
        role: user.role,
        contractor_id: user.contractor_id
      }
    };
  } catch (error) {
    logger.error('LOGIN_SYSTEM_ERROR', { error: String(error) });
    return { success: false, error: 'システムエラーが発生しました' };
  }
}

export function logoutMock(): void {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.removeItem('user_id');
    window.sessionStorage.removeItem('role');
    window.sessionStorage.removeItem('contractor_id');
  }
}