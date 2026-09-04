import { UserRepository } from '../repository/userRepository';
import { AuditLog } from '../domain/user';
import { logger } from '@/lib/logger/logger';

export type AppError = 
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'AUTH_ERROR'; message: string }
  | { type: 'SYSTEM_ERROR'; message: string };

export type Result<T, E> = { success: true; data: T } | { success: false; error: E };

export interface LoginResult {
  userId: string;
  role: string;
  contractorId: string | null;
  displayName: string;
}

export class LoginUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(loginId: string, password_plain: string): Promise<Result<LoginResult, AppError>> {
    logger.info('LOGIN_ATTEMPT', { loginId });

    if (!loginId) {
      return {
        success: false,
        error: { type: 'VALIDATION_ERROR', message: 'ログインIDを入力してください' }
      };
    }
    if (!password_plain) {
      return {
        success: false,
        error: { type: 'VALIDATION_ERROR', message: 'パスワードを入力してください' }
      };
    }

    try {
      const user = await this.userRepository.findByLoginId(loginId);
      
      if (!user || user.password_hash !== password_plain) {
        logger.warn('LOGIN_FAILED', { loginId, reason: 'Invalid credentials' });
        return {
          success: false,
          error: { type: 'AUTH_ERROR', message: 'ログインIDまたはパスワードが正しくありません' }
        };
      }

      if (user.status !== 'ACTIVE') {
        logger.warn('LOGIN_FAILED', { loginId, reason: 'User not active' });
        return {
          success: false,
          error: { type: 'AUTH_ERROR', message: 'このアカウントは現在利用できません' }
        };
      }

      // 監査ログ書き込み
      const randomId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      const auditLog: AuditLog = {
        audit_id: `audit-${randomId}`,
        occurred_at: new Date().toISOString(),
        actor_user_id: user.user_id,
        actor_role: user.role,
        action: 'LOGIN',
        detail: { login_id: user.login_id }
      };
      await this.userRepository.saveAuditLog(auditLog);

      // sessionStorage にセッション状態を保存
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('user_id', user.user_id);
        sessionStorage.setItem('role', user.role);
        if (user.contractor_id) {
          sessionStorage.setItem('contractor_id', user.contractor_id);
        } else {
          sessionStorage.removeItem('contractor_id');
        }
        sessionStorage.setItem('display_name', user.display_name);
      }

      logger.info('LOGIN_SUCCESS', { userId: user.user_id, role: user.role });

      return {
        success: true,
        data: {
          userId: user.user_id,
          role: user.role,
          contractorId: user.contractor_id,
          displayName: user.display_name,
        }
      };
    } catch (err) {
      logger.error('LOGIN_SYSTEM_ERROR', err, { loginId });
      return {
        success: false,
        error: { type: 'SYSTEM_ERROR', message: 'システムエラーが発生しました。時間をおいて再度お試しください。' }
      };
    }
  }
}