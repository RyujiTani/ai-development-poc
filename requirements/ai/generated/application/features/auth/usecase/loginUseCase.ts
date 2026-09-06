import { getDB } from '@/lib/db/indexedDB';
import { hashPassword } from '@/lib/auth/hash';
import { Result } from '@/lib/error/AppError';
import { recordAuditLog } from '@/lib/db/auditLog';
import { logger } from '@/lib/logger/logger';

export interface LoginInput {
  loginId: string;
  passwordPlain: string;
}

export interface LoginResult {
  userId: string;
  role: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
  displayName: string;
  contractorId: string | null;
}

export async function loginUseCase(input: LoginInput): Promise<Result<LoginResult>> {
  logger.info('LOGIN_ATTEMPT', { loginId: input.loginId });

  try {
    const db = await getDB();
    const tx = db.transaction('users', 'readonly');
    const index = tx.store.index('by-login-id');
    const user = await index.get(input.loginId);
    await tx.done;

    if (!user) {
      logger.warn('LOGIN_FAILED_USER_NOT_FOUND', { loginId: input.loginId });
      return {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'ログインIDまたはパスワードが正しくありません' },
      };
    }

    if (user.status !== 'ACTIVE') {
      logger.warn('LOGIN_FAILED_USER_NOT_ACTIVE', { loginId: input.loginId, status: user.status });
      return {
        success: false,
        error: { code: 'USER_LOCKED_OR_DISABLED', message: 'このアカウントは現在利用できません' },
      };
    }

    const expectedHash = hashPassword(input.passwordPlain);
    if (user.password_hash !== expectedHash) {
      logger.warn('LOGIN_FAILED_PASSWORD_MISMATCH', { loginId: input.loginId });
      return {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'ログインIDまたはパスワードが正しくありません' },
      };
    }

    if (user.role !== 'CONTRACTOR_MANAGER') {
      logger.warn('LOGIN_FAILED_INVALID_ROLE', { loginId: input.loginId, role: user.role });
      return {
        success: false,
        error: { code: 'INVALID_ROLE', message: 'ログインIDまたはパスワードが正しくありません' },
      };
    }

    logger.info('LOGIN_SUCCESS', { userId: user.user_id, role: user.role });

    await recordAuditLog({
      actor_user_id: user.user_id,
      actor_role: user.role,
      action: 'LOGIN',
      detail: { loginId: input.loginId },
    });

    return {
      success: true,
      value: {
        userId: user.user_id,
        role: user.role,
        displayName: user.display_name,
        contractorId: user.contractor_id,
      },
    };
  } catch (error) {
    logger.error('LOGIN_SYSTEM_ERROR', { error: String(error) });
    return {
      success: false,
      error: { code: 'SYSTEM_ERROR', message: 'システムエラーが発生しました。時間をおいて再度お試しください。' },
    };
  }
}