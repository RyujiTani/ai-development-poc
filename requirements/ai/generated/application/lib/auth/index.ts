import { getDB } from '@/lib/db';
import { User, AuditLog } from '@/features/user/domain/types';
import { logger } from '@/lib/logger';

export interface LoginResult {
  success: boolean;
  user?: {
    user_id: string;
    role: string;
    display_name: string;
  };
  error?: string;
}

export async function login(loginId: string, password_raw: string): Promise<LoginResult> {
  try {
    const db = await getDB();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const index = store.index('by-login-id');
    const user: User | undefined = await index.get(loginId);
    await tx.done;

    if (!user) {
      logger.info('LOGIN_FAILED_USER_NOT_FOUND', { login_id: loginId });
      return { success: false, error: 'IDまたはパスワードが正しくありません' };
    }

    // パスワード突合 (簡易ハッシュ: Base64)
    const expectedHash = btoa(password_raw);
    if (user.password_hash !== expectedHash) {
      logger.info('LOGIN_FAILED_PASSWORD_MISMATCH', { login_id: loginId });
      return { success: false, error: 'IDまたはパスワードが正しくありません' };
    }

    if (user.status !== 'ACTIVE') {
      logger.info('LOGIN_FAILED_USER_INACTIVE', { login_id: loginId, status: user.status });
      return { success: false, error: 'このアカウントは現在利用できません' };
    }

    // ログイン成功処理
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('user_id', user.user_id);
      sessionStorage.setItem('role', user.role);
      if (user.contractor_id) {
        sessionStorage.setItem('contractor_id', user.contractor_id);
      } else {
        sessionStorage.removeItem('contractor_id');
      }
    }

    // 監査ログ作成
    const auditLog: AuditLog = {
      audit_id: `audit-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
      occurred_at: new Date().toISOString(),
      actor_user_id: user.user_id,
      actor_role: user.role,
      action: 'LOGIN',
      detail: { login_id: user.login_id }
    };

    const auditTx = db.transaction('audit_logs', 'readwrite');
    await auditTx.objectStore('audit_logs').put(auditLog);
    await auditTx.done;

    logger.info('LOGIN_SUCCESS', { user_id: user.user_id, role: user.role });

    return {
      success: true,
      user: {
        user_id: user.user_id,
        role: user.role,
        display_name: user.display_name
      }
    };
  } catch (error) {
    logger.error('LOGIN_SYSTEM_ERROR', { error: String(error) });
    return { success: false, error: 'システムエラーが発生しました' };
  }
}

export function logout(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('user_id');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('contractor_id');
  }
  logger.info('LOGOUT_SUCCESS');
}