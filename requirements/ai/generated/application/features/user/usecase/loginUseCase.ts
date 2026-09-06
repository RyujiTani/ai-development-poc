import { UserRepository } from '../repository/userRepository';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';

export interface LoginInput {
  loginId: string;
  password_hash: string;
}

export interface LoginOutput {
  user_id: string;
  role: string;
  display_name: string;
}

export class LoginUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(input: LoginInput): Promise<Result<LoginOutput, AppError>> {
    try {
      const user = await this.userRepository.findByLoginId(input.loginId);
      if (!user) {
        logger.info('LOGIN_FAILED_USER_NOT_FOUND', { login_id: input.loginId });
        return {
          success: false,
          error: new AppError('IDまたはパスワードが正しくありません。', 'AUTH_FAILED'),
        };
      }

      if (user.status !== 'ACTIVE') {
        logger.info('LOGIN_FAILED_USER_INACTIVE', { user_id: user.user_id });
        return {
          success: false,
          error: new AppError('このアカウントは無効化されています。', 'ACCOUNT_DISABLED'),
        };
      }

      if (user.password_hash !== input.password_hash) {
        logger.info('LOGIN_FAILED_PASSWORD_MISMATCH', { user_id: user.user_id });
        return {
          success: false,
          error: new AppError('IDまたはパスワードが正しくありません。', 'AUTH_FAILED'),
        };
      }

      user.last_login_at = new Date().toISOString();
      await this.userRepository.save(user);

      logger.info('LOGIN_SUCCESS', { user_id: user.user_id });

      return {
        success: true,
        value: {
          user_id: user.user_id,
          role: user.role,
          display_name: user.display_name,
        },
      };
    } catch (e) {
      logger.error('LOGIN_SYSTEM_ERROR', e);
      return {
        success: false,
        error: new AppError('システムエラーが発生しました。', 'SYSTEM_ERROR'),
      };
    }
  }
}