import { UserRepository } from '../repository/userRepository';
import { Result } from '@/lib/error/result';
import { hashPassword } from '@/lib/db/seed';

export interface LoginResult {
  token: string;
  user_info: {
    user_id: string;
    contractor_id: string | null;
    role: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
    display_name: string;
  };
}

export class LoginUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(loginId: string, password: string): Promise<Result<LoginResult>> {
    try {
      const user = await this.userRepository.findByLoginId(loginId);
      if (!user) {
        return {
          success: false,
          error: { code: 'AUTH_FAILED', message: 'IDまたはパスワードが正しくありません' }
        };
      }

      if (user.status !== 'ACTIVE') {
        return {
          success: false,
          error: { code: 'AUTH_FAILED', message: 'このアカウントは現在利用できません' }
        };
      }

      const hashedPassword = hashPassword(password);
      if (user.password_hash !== hashedPassword) {
        return {
          success: false,
          error: { code: 'AUTH_FAILED', message: 'IDまたはパスワードが正しくありません' }
        };
      }

      await this.userRepository.updateLastLogin(user.user_id);

      const token = `mock-jwt-token-for-${user.user_id}`;

      return {
        success: true,
        value: {
          token,
          user_info: {
            user_id: user.user_id,
            contractor_id: user.contractor_id,
            role: user.role,
            display_name: user.display_name,
          }
        }
      };
    } catch (e) {
      return {
        success: false,
        error: { code: 'SYSTEM_ERROR', message: 'システムエラーが発生しました。時間を置いて再度お試しください。' }
      };
    }
  }
}