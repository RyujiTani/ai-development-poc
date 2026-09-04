import { UserRepository } from '@/features/user/repository/userRepository';
import { Role } from '@/features/user/domain/user';

export type AppError = {
  code: 'AUTH_FAILED' | 'INVALID_INPUT' | 'SYSTEM_ERROR';
  message: string;
};

export type Result<T, E> = { success: true; value: T } | { success: false; error: E };

export interface LoginResult {
  token: string;
  admin_info: {
    user_id: string;
    display_name: string;
    role: Role;
  };
}

export class LoginUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(loginId: string, password_hash: string): Promise<Result<LoginResult, AppError>> {
    try {
      if (!loginId || !password_hash) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'IDとパスワードを入力してください。' }
        };
      }

      const user = await this.userRepository.findByLoginId(loginId);
      if (!user) {
        return {
          success: false,
          error: { code: 'AUTH_FAILED', message: 'IDまたはパスワードが正しくありません' }
        };
      }

      if (user.role !== 'FACTORY_ADMIN') {
        return {
          success: false,
          error: { code: 'AUTH_FAILED', message: '管理者権限がありません' }
        };
      }

      if (user.status !== 'ACTIVE') {
        return {
          success: false,
          error: { code: 'AUTH_FAILED', message: 'このアカウントは現在無効化されています' }
        };
      }

      if (user.password_hash !== password_hash) {
        return {
          success: false,
          error: { code: 'AUTH_FAILED', message: 'IDまたはパスワードが正しくありません' }
        };
      }

      const token = `mock-jwt-token-for-${user.user_id}`;
      return {
        success: true,
        value: {
          token,
          admin_info: {
            user_id: user.user_id,
            display_name: user.display_name,
            role: user.role
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: { code: 'SYSTEM_ERROR', message: 'システムエラーが発生しました' }
      };
    }
  }
}