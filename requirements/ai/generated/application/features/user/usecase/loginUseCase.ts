import { Result } from '../../../lib/error/appError';
import { User } from '../domain/user';
import { UserRepository } from '../repository/userRepository';
import { hashPassword } from '../../../lib/auth/hash';
import { sessionManager } from '../../../lib/auth/session';
import { logger } from '../../../lib/logger/logger';

export interface LoginResult {
  user: User;
}

export class LoginUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(loginId: string, passwordRaw: string): Promise<Result<LoginResult>> {
    try {
      logger.info('login_attempt', { login_id: loginId });

      const user = await this.userRepository.findByLoginId(loginId);
      if (!user) {
        logger.warn('login_failed_user_not_found', { login_id: loginId });
        return {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'IDまたはパスワードが正しくありません。' },
        };
      }

      if (user.status === 'LOCKED' || user.status === 'DISABLED') {
        logger.warn('login_failed_user_locked_or_disabled', { login_id: loginId, status: user.status });
        return {
          success: false,
          error: { code: 'USER_LOCKED', message: 'このアカウントはロックされているか、無効化されています。' },
        };
      }

      const inputHash = await hashPassword(passwordRaw);
      if (user.password_hash !== inputHash) {
        logger.warn('login_failed_incorrect_password', { login_id: loginId });
        return {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'IDまたはパスワードが正しくありません。' },
        };
      }

      // セッション情報を保存
      sessionManager.saveSession({
        user_id: user.user_id,
        role: user.role,
        display_name: user.display_name,
      });

      // 最終ログイン時間の更新
      const updatedUser: User = {
        ...user,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await this.userRepository.save(updatedUser);

      logger.info('login_success', { user_id: user.user_id, role: user.role });

      return {
        success: true,
        value: { user: updatedUser },
      };
    } catch (error) {
      logger.error('login_system_error', error, { login_id: loginId });
      return {
        success: false,
        error: { code: 'SYSTEM_ERROR', message: 'システムエラーが発生しました。時間をおいて再度お試しください。' },
      };
    }
  }
}