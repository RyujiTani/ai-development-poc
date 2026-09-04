import { UserRepository } from '../repository/userRepository';
import { mockHashPassword } from '@/lib/auth/hash';
import { logger } from '@/lib/logger/logger';
import { Role } from '../domain/user';

export type AppErrorCode = 'AUTH_FAILED' | 'INVALID_INPUT' | 'DB_ERROR' | 'PERMISSION_DENIED';

export interface AppError {
  code: AppErrorCode;
  message: string;
}

export type Result<T, E = AppError> =
  | { success: true; value: T }
  | { success: false; error: E };

export interface LoginResponse {
  token: string;
  admin_info: {
    user_id: string;
    display_name: string;
    role: Role;
  };
}

export class LoginUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(loginId: string, passwordHash: string): Promise<Result<LoginResponse>> {
    try {
      // 1. バリデーションチェック（ID, PW必須）
      if (!loginId.trim()) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'IDを入力してください。' }
        };
      }
      if (!passwordHash.trim()) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'パスワードを入力してください。' }
        };
      }

      // 2. リポジトリからユーザーの取得
      const user = await this.userRepository.findByLoginId(loginId);
      if (!user) {
        logger.warn('AUTH_FAILED_USER_NOT_FOUND', { login_id: loginId });
        return {
          success: false,
          error: { code: 'AUTH_FAILED', message: 'IDまたはパスワードが正しくありません。' }
        };
      }

      // 3. アカウントロックなどのステータス検証
      if (user.status !== 'ACTIVE') {
        logger.warn('AUTH_FAILED_INACTIVE_USER', { login_id: loginId, status: user.status });
        return {
          success: false,
          error: { code: 'PERMISSION_DENIED', message: 'このアカウントは現在利用できません。' }
        };
      }

      // 4. 工場管理者（FACTORY_ADMIN）であるか権限検証
      if (user.role !== 'FACTORY_ADMIN') {
        logger.warn('AUTH_FAILED_INSUFFICIENT_ROLE', { login_id: loginId, role: user.role });
        return {
          success: false,
          error: { code: 'PERMISSION_DENIED', message: '管理者権限がありません。' }
        };
      }

      // 5. ハッシュ値による検証
      if (user.password_hash !== passwordHash) {
        logger.warn('AUTH_FAILED_PASSWORD_MISMATCH', { login_id: loginId });
        return {
          success: false,
          error: { code: 'AUTH_FAILED', message: 'IDまたはパスワードが正しくありません。' }
        };
      }

      // 6. 最終ログイン時刻の更新
      const updatedUser = {
        ...user,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await this.userRepository.save(updatedUser);

      // モック用トークンの生成
      const mockToken = `mock_jwt_token_${Buffer.from(JSON.stringify({ userId: user.user_id, role: user.role })).toString('base64')}`;

      logger.info('AUTH_SUCCESS', { user_id: user.user_id, role: user.role });

      return {
        success: true,
        value: {
          token: mockToken,
          admin_info: {
            user_id: user.user_id,
            display_name: user.display_name,
            role: user.role
          }
        }
      };
    } catch (error) {
      logger.error('AUTH_CRITICAL_ERROR', { error: String(error) });
      return {
        success: false,
        error: { code: 'DB_ERROR', message: 'システムエラーが発生しました。時間をおいて再度お試しください。' }
      };
    }
  }
}